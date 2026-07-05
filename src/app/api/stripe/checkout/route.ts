import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  console.log('APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
  console.log('Success URL:', `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`);
  console.log('Cancel URL:', `${process.env.NEXT_PUBLIC_APP_URL}/payment-cancelled`);
  
  try {
    const body = await request.json();
    const { invoiceId, amount, invoiceNumber, customerEmail } = body;

    if (!invoiceId || !amount || !invoiceNumber || !customerEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-cancelled`,
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Invoice ${invoiceNumber}`,
              description: `Payment for invoice ${invoiceNumber}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId,
        invoiceNumber,
      },
    });
    
    console.log('Session created:', session.id);

    // Return session ID
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Stripe error details:', {
      type: error.type,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      raw: error.raw
    });
    console.error("❌ Stripe checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
