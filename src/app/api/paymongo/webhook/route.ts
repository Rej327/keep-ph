import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/serverClient";

export async function POST(request: NextRequest) {
  try {
    console.log("Webhook request received");
    const body = await request.text();
    const signature = request.headers.get("paymongo-signature");
    console.log("Signature:", signature);
    // console.log("Body:", body); // Uncomment if needed, but be careful with PII

    // Verify webhook signature
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

    // For development/testing, allow skipping signature verification if no secret is set
    // OR if we want to bypass it for debugging (temporarily)
    let isSignatureValid = false;

    if (webhookSecret && signature) {
      // Paymongo signature format: t=timestamp,te=test_signature,li=live_signature
      const signatureParts = signature.split(",");
      const timestampPart = signatureParts.find((p) => p.startsWith("t="));
      const testSignaturePart = signatureParts.find((p) => p.startsWith("te="));
      const liveSignaturePart = signatureParts.find((p) => p.startsWith("li="));

      const timestamp = timestampPart?.split("=")[1];
      const testSignature = testSignaturePart?.split("=")[1];
      const liveSignature = liveSignaturePart?.split("=")[1];

      // Use test signature for test mode, live signature for live mode
      const providedSignature = testSignature || liveSignature;

      if (timestamp && providedSignature) {
        const payload = `${timestamp}.${body}`;
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(payload)
          .digest("hex");

        if (providedSignature === expectedSignature) {
          isSignatureValid = true;
        } else {
          console.error("Signature mismatch:", {
            provided: providedSignature,
            expected: expectedSignature,
          });
        }
      }
    } else {
      // If no secret/signature, assume valid for local dev if intended
      console.warn(
        "Missing webhook secret or signature - proceeding without verification for debug"
      );
      isSignatureValid = true;
    }

    // FIXME: For now, we proceed even if signature is invalid to debug the logic
    if (!isSignatureValid) {
      console.warn(
        "Signature validation failed, but proceeding for debug purposes."
      );
    }

    const event = JSON.parse(body);
    console.log("Webhook event received:", JSON.stringify(event, null, 2));

    // Handle the event
    switch (event.data.attributes.type) {
      case "checkout_session.payment.paid":
        // Checkout session payment successful
        const checkoutSessionId = event.data.attributes.data.id;
        const checkoutAmount = event.data.attributes.data.attributes.amount;
        const checkoutMetadata = event.data.attributes.data.attributes.metadata;

        console.log("Checkout session payment successful:", {
          checkoutSessionId,
          checkoutAmount,
          checkoutMetadata,
        });

        // Handle different payment types
        if (checkoutMetadata?.type === "mailbox_addition") {
          // Add mailboxes
          await handleMailboxAddition(checkoutMetadata);
        } else if (checkoutMetadata?.type === "subscription_creation") {
          // Create subscription
          await handleSubscriptionCreation(checkoutMetadata);
        } else if (checkoutMetadata?.planId) {
          // Plan change
          await handlePlanChange(checkoutMetadata);
        }

        break;
      case "link.payment.paid":
      case "payment.paid":
        // Payment successful
        console.log("Processing payment event:", event.data.attributes.type);
        const paymentIntentId = event.data.attributes.data.id;
        const amount = event.data.attributes.data.attributes.amount;
        // For link.payment.paid, metadata is directly in attributes, not nested in data.attributes
        // Let's try to find metadata in both possible locations
        const metadata =
          event.data.attributes.data.attributes.metadata ||
          event.data.attributes.data.metadata;

        console.log("Payment successful:", {
          paymentIntentId,
          amount,
          metadata,
        });

        // Handle different payment types
        if (metadata?.type === "mailbox_addition") {
          // Add mailboxes
          await handleMailboxAddition(metadata);
        } else if (metadata?.type === "subscription_creation") {
          // Subscription creation
          await handleSubscriptionCreation(metadata);
        } else if (metadata?.planId) {
          // Plan change
          await handlePlanChange(metadata);
        }

        break;
      case "payment.failed":
        console.log("Payment failed:", event.data);
        break;
      default:
        console.log("Unhandled event type:", event.data.attributes.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function handleMailboxAddition(metadata: Record<string, unknown>) {
  const { accountId, numMailboxes, planId } = metadata as {
    accountId: string;
    numMailboxes: number;
    planId: string;
  };

  if (!accountId || !numMailboxes || !planId) {
    console.error("Invalid mailbox addition metadata");
    return;
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Get mail access limit
    const { data: limitData, error: limitError } = await supabase.rpc(
      "get_mail_access_limit",
      {
        input_user_id: null,
        input_plan_id: planId,
      }
    );

    if (limitError) throw limitError;

    // Generate mailboxes
    const existingMailboxes = await supabase
      .schema("mailroom_schema")
      .from("mailbox_table")
      .select("mailbox_label");

    const usedLabels = new Set(
      existingMailboxes.data?.map(
        (m: { mailbox_label: string }) => m.mailbox_label
      ) || []
    );

    const mailboxes = [];
    let addedCount = 0;
    for (let page = 1; page <= 4; page++) {
      if (addedCount >= numMailboxes) break;
      const letter = String.fromCharCode(65 + (page - 1));
      for (let i = 1; i <= 15; i++) {
        if (addedCount >= numMailboxes) break;
        const id = `${letter}${i}`;
        if (!usedLabels.has(id)) {
          mailboxes.push({
            mailbox_status_id: "MBS-ACTIVE",
            mailbox_label: id,
            mailbox_mail_remaining_space:
              limitData.account_max_quantity_storage || 0,
            mailbox_package_remaining_space:
              limitData.account_max_parcel_handling || 0,
          });
          usedLabels.add(id); // Mark as used for this batch
          addedCount++;
        }
      }
    }

    // Add mailboxes
    const { error } = await supabase.rpc("add_mailboxes_to_account", {
      input_data: {
        account_id: accountId,
        mailbox: mailboxes,
      },
    });

    if (error) throw error;

    console.log(`Added ${mailboxes.length} mailboxes to account ${accountId}`);
  } catch (error) {
    console.error("Error handling mailbox addition:", error);
  }
}

async function handlePlanChange(metadata: Record<string, unknown>) {
  const { accountId, planId } = metadata as {
    accountId: string;
    planId: string;
  };

  if (!accountId || !planId) {
    console.error("Invalid plan change metadata");
    return;
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Update account type
    const { error } = await supabase
      .schema("user_schema")
      .from("account_table")
      .update({
        account_type: planId,
        account_subscription_status_id: "SST-ACTIVE",
        account_subscription_ends_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days
      })
      .eq("account_id", accountId);

    if (error) throw error;

    console.log(`Updated account ${accountId} to plan ${planId}`);
  } catch (error) {
    console.error("Error handling plan change:", error);
  }
}

async function handleSubscriptionCreation(metadata: Record<string, unknown>) {
  console.log("Subscription creation metadata received:", metadata);

  const { userId, planId, numMailboxes, locationKey, referralCode } =
    metadata as {
      userId: string;
      planId: string;
      numMailboxes: number;
      locationKey: string;
      referralCode?: string;
    };

  if (!userId || !planId || typeof numMailboxes !== "number" || !locationKey) {
    return console.error("Invalid subscription metadata:", metadata);
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Get mail access limits
    const { data: limits, error: limitErr } = await supabase.rpc(
      "get_mail_access_limit",
      { input_user_id: userId, input_plan_id: planId }
    );
    if (limitErr) throw limitErr;

    // Calculate subscription end date
    const now = new Date();
    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setDate(
      now.getDate() + (limits.account_duration_days || 30)
    );

    // Get existing mailbox labels to avoid duplicates
    const { data: existing } = await supabase
      .schema("mailroom_schema")
      .from("mailbox_table")
      .select("mailbox_label");

    const usedLabels = new Set(
      existing?.map((m: { mailbox_label: string }) => m.mailbox_label)
    );

    // Generate unique mailbox labels
    const mailboxes = [];
    if (numMailboxes > 0) {
      let addedCount = 0;
      for (let page = 1; page <= 4; page++) {
        if (addedCount >= numMailboxes) break;
        const letter = String.fromCharCode(65 + (page - 1));
        for (let i = 1; i <= 15; i++) {
          if (addedCount >= numMailboxes) break;
          const label = `${letter}${i}`;
          if (!usedLabels.has(label)) {
            mailboxes.push({
              mailbox_status_id: "MBS-ACTIVE",
              mailbox_label: label,
              mailbox_mail_remaining_space:
                limits.account_max_quantity_storage || 0,
              mailbox_package_remaining_space:
                limits.account_max_parcel_handling || 0,
            });
            usedLabels.add(label);
            addedCount++;
          }
        }
      }
    }

    // Prepare subscription data
    const subscriptionData = {
      user_id: userId,
      referred_by: referralCode || null,
      account_type: planId,
      account_is_subscribed: true,
      account_subscription_ends_at: subscriptionEndsAt.toISOString(),
      account_remaining_mailbox_access:
        (limits.account_max_mailbox_access || 0) - mailboxes.length,
      account_subscription_status_id: "SST-ACTIVE",
      account_address_key: locationKey,
      mailbox: mailboxes,
    };

    // Create the subscription account
    const { error: createErr } = await supabase.rpc(
      "create_user_subscription_account",
      { input_data: subscriptionData }
    );

    if (createErr) throw createErr;

    console.log(
      `Created subscription account for user ${userId} with ${mailboxes.length} mailboxes`
    );
  } catch (err) {
    console.error("Subscription creation error:", err);
  }
}
