import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured" },
      { status: 500 },
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
  });

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("❌ Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const supabase = createAdminSupabaseClient();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const purchaseType = session.metadata?.purchaseType;

      if (purchaseType === "lead_marketplace_credits") {
        const tenantId = session.metadata?.tenantId;
        const packageId = session.metadata?.packageId;
        const packageCredits = Number(session.metadata?.packageCredits ?? "0");
        const packageAmountCents = Number(
          session.metadata?.packageAmountCents ?? "0",
        );
        const initiatedByUserId = session.metadata?.initiatedByUserId || null;

        if (!tenantId || !packageId || packageCredits <= 0) {
          console.error(
            "❌ Invalid lead credits metadata in checkout session",
            {
              sessionId: session.id,
              tenantId,
              packageId,
              packageCredits,
            },
          );
          return NextResponse.json(
            { error: "Invalid lead credits metadata" },
            { status: 400 },
          );
        }

        const eventLogInsert = await supabase
          .from("marketplace_credit_webhook_events")
          .insert({
            event_id: event.id,
            event_type: event.type,
            payload: {
              stripeEventId: event.id,
              checkoutSessionId: session.id,
              tenantId,
              packageId,
              packageCredits,
            },
          });

        if (eventLogInsert.error && eventLogInsert.error.code === "23505") {
          console.log("✓ Duplicate Stripe event ignored", event.id);
          return NextResponse.json({ received: true, duplicate: true });
        }

        if (eventLogInsert.error) {
          console.error("❌ Failed to persist webhook idempotency event", {
            eventId: event.id,
            error: eventLogInsert.error,
          });
          return NextResponse.json(
            { error: "Failed to persist webhook event" },
            { status: 500 },
          );
        }

        const purchaseResult = await supabase.rpc(
          "marketplace_apply_credit_purchase",
          {
            target_tenant_id: tenantId,
            package_id: packageId,
            package_credits: packageCredits,
            package_amount_cents: packageAmountCents,
            stripe_event_id: event.id,
            stripe_checkout_session_id: session.id,
            actor_user_id: initiatedByUserId,
          },
        );

        if (purchaseResult.error) {
          console.error("❌ Failed to apply credit purchase", {
            eventId: event.id,
            sessionId: session.id,
            error: purchaseResult.error,
          });
          return NextResponse.json(
            { error: "Failed to apply credit purchase" },
            { status: 500 },
          );
        }

        console.log(`✓ Lead credits applied for tenant ${tenantId}`, {
          eventId: event.id,
          sessionId: session.id,
          packageId,
          packageCredits,
        });

        return NextResponse.json({ received: true });
      }

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
        console.error("❌ Failed to update invoice status:", updateError);
        return NextResponse.json(
          { error: "Failed to update invoice" },
          { status: 500 },
        );
      }

      console.log(
        `✓ Invoice ${invoiceId} marked as Paid (Stripe: ${session.id})`,
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
