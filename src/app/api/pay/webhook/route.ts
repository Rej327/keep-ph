import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("paymongo-signature");

    if (!signatureHeader) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // Parse signature header: t=timestamp,te=test_sig,li=live_sig
    const signatureParts = signatureHeader.split(",").reduce((acc, part) => {
      const [key, value] = part.split("=");
      acc[key.trim()] = value.trim();
      return acc;
    }, {} as Record<string, string>);

    const t = signatureParts["t"];
    // Prioritize test signature for sandbox environment
    const signature = signatureParts["te"] || signatureParts["li"];

    if (!t || !signature) {
      return NextResponse.json(
        { error: "Invalid signature format" },
        { status: 401 }
      );
    }

    const signedPayload = `${t}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET || "")
      .update(signedPayload)
      .digest("hex");

    if (
      process.env.PAYMONGO_WEBHOOK_SECRET &&
      signature !== expectedSignature
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.data.attributes.type;
    const resourceId = event.data.attributes.data.id; // checkout session ID

    let paymentStatus = "pending";
    if (eventType === "checkout_session.payment.paid") {
      paymentStatus = "succeeded";
    } else if (eventType.includes("failed")) {
      paymentStatus = "failed";
    } else {
      // Return early for irrelevant events
      return NextResponse.json({ message: "Event ignored" });
    }

    const supabase = await createSupabaseServerClient();

    // Use service role if needed, but since this is an API route,
    // and we are updating based on webhook, standard client might lack permissions
    // if RLS prevents update without auth.
    // However, createSupabaseServerClient uses cookies, so it acts as the user IF the user is browsing,
    // but the Webhook is a server-to-server call.
    // The Webhook request DOES NOT have user cookies.
    // So createSupabaseServerClient() will return an anon client.
    // RLS on 'customer_paymongo_payments' MUST allow update by anon/service_role OR we need a service role client.
    // The user's prompt says "Use createSupabaseServerClient".
    // But usually for Webhooks we need a Service Role client because there is no logged-in user context in the request.

    // I will check if there is a service role client available or if I should assume RLS is open for this RPC?
    // The RPC `process_paymongo_webhook` is SECURITY DEFINER?
    // The SQL I wrote earlier: `SECURITY DEFINER` was commented out as optional.
    // I SHOULD add `SECURITY DEFINER` to the RPC to allow it to run with elevated privileges.
    // I will modify the SQL file to include SECURITY DEFINER for `process_paymongo_webhook`.

    const { error } = await supabase.rpc("process_paymongo_webhook", {
      input_data: {
        intent_id: resourceId,
        payment_status: paymentStatus,
        event_type: eventType,
      },
    });

    if (error) {
      console.error("RPC Error:", error);
      return NextResponse.json(
        { error: "Database update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
