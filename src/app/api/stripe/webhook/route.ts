import "@/lib/globals-polyfill";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("❌ Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;

      if (!invoiceId) {
        console.warn("⚠️ No invoiceId in session metadata");
        return NextResponse.json({ received: true });
      }

      // Update invoice status to "Paid" in Supabase
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "Paid",
          stripe_payment_id: session.payment_intent as string,
          payment_date: new Date().toISOString(),
          payment_method: "stripe_card",
        })
        .eq("id", invoiceId);

      if (updateError) {
        console.error(
          "❌ Failed to update invoice status:",
          updateError
        );
        return NextResponse.json(
          { error: "Failed to update invoice" },
          { status: 500 }
        );
      }

      console.log(
        `✓ Invoice ${invoiceId} marked as Paid (Stripe: ${session.id})`
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
