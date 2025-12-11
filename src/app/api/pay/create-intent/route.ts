import { createSupabaseServerClient } from "@/utils/supabase/serverClient";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan_id, amount, plan_name, provisioning_data, numMailboxes } =
      await request.json();

    if (!process.env.PAYMONGO_SECRET_KEY) {
      console.error("PAYMONGO_SECRET_KEY is missing");
      return NextResponse.json(
        { error: "Configuration error" },
        { status: 500 }
      );
    }

    // 1. Create PayMongo Checkout Session
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        authorization: `Basic ${Buffer.from(
          process.env.PAYMONGO_SECRET_KEY || ""
        ).toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
            line_items: [
              {
                currency: "PHP",
                amount: amount, // Amount in cents
                description: `Subscription to ${plan_name}`,
                name: plan_name,
                quantity: numMailboxes,
              },
            ],
            payment_method_types: [
              "card",
              // "gcash",
              // "paymaya",
              // "grab_pay",
              // "dob",
            ],
            success_url: `${
              process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
            }/customer/subscription?status=success`,
            cancel_url: `${
              process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
            }/customer/subscription?status=failed`,
            description: `Subscription for ${user.email}`,
          },
        },
      }),
      signal: AbortSignal.timeout(30000), // 30 seconds timeout
    };

    const response = await fetch(
      "https://api.paymongo.com/v1/checkout_sessions",
      options
    );
    const paymongoData = await response.json();

    if (paymongoData.errors) {
      console.error("PayMongo Error:", paymongoData.errors);
      return NextResponse.json(
        { error: "Payment gateway error" },
        { status: 500 }
      );
    }

    const checkoutSessionId = paymongoData.data.id;
    const checkoutUrl = paymongoData.data.attributes.checkout_url;

    // 2. Init Subscription in DB
    const { error: rpcError } = await supabase.rpc(
      "init_subscription_payment",
      {
        input_data: {
          user_id: user.id,
          plan_id: plan_id,
          intent_id: checkoutSessionId,
          amount: amount,
          metadata: {
            checkout_url: checkoutUrl,
            paymongo_id: checkoutSessionId,
            provisioning_data: provisioning_data,
            num_mailboxes: numMailboxes,
          },
        },
      }
    );

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (error) {
    console.error("Internal Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
