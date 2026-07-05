import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      console.error("❌ No sessionId provided");
      return NextResponse.json(
        { error: "Missing sessionId" },
        { status: 400 }
      );
    }

    console.log("📋 Retrieving Stripe session:", sessionId);

    // Retrieve checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log("✓ Session retrieved:", {
      id: session.id,
      payment_status: session.payment_status,
      metadata: session.metadata,
    });

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      console.error("❌ Payment not completed for session:", sessionId);
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Get metadata
    const invoiceId = session.metadata?.invoiceId;
    const invoiceNumber = session.metadata?.invoiceNumber;

    if (!invoiceId) {
      console.error("❌ No invoiceId in session metadata");
      return NextResponse.json(
        { error: "Invoice ID not found in payment metadata" },
        { status: 400 }
      );
    }

    console.log("💾 Invoice to update:", { invoiceId, invoiceNumber });

    // Get Supabase client
    const supabase = await createServerSupabaseClient();

    // Verify invoice exists
    console.log("🔍 Verifying invoice exists:", invoiceId);
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, stripe_payment_id, payment_date")
      .eq("id", invoiceId)
      .single();

    if (fetchError) {
      console.error("❌ Error fetching invoice:", {
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
      });
      return NextResponse.json(
        {
          error: "Invoice not found",
          details: fetchError.message,
        },
        { status: 404 }
      );
    }

    console.log("✓ Invoice found:", invoice);

    // Update invoice status
    console.log("📝 Updating invoice status to Paid...");
    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "Paid",
        stripe_payment_id: session.payment_intent || session.id,
        payment_date: new Date().toISOString(),
        payment_method: "stripe_card",
      })
      .eq("id", invoiceId)
      .select();

    if (updateError) {
      console.error("❌ Error updating invoice:", {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
      });
      return NextResponse.json(
        {
          error: "Failed to update invoice",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ Invoice updated successfully:", updated);

    return NextResponse.json({
      success: true,
      message: "Invoice status updated to Paid",
      invoice: updated[0],
    });
  } catch (error: any) {
    console.error("❌ Error in confirm-payment endpoint:", {
      type: error.type,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Payment confirmation failed",
      },
      { status: 500 }
    );
  }
}
