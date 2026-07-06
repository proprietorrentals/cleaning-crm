import "@/lib/globals-polyfill";
import Stripe from "stripe";

export async function GET() {
  console.log('Stripe key loaded:', process.env.STRIPE_SECRET_KEY ? 'Yes' : 'No');
  console.log('Key starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 15));
  console.log('Key from env:', process.env.STRIPE_SECRET_KEY?.substring(0, 20));
  
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json(
        { success: false, error: "STRIPE_SECRET_KEY not configured" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    await stripe.balance.retrieve();

    return Response.json({
      success: true,
      message: "Stripe API key is valid and working",
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: {
          type: error.type,
          code: error.code,
          message: error.message,
          request_id: error.requestId,
          statusCode: error.statusCode,
          raw_error: JSON.stringify(error, null, 2),
        },
      },
      { status: error.statusCode || 500 }
    );
  }
}
