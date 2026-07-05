import Stripe from "stripe";

export async function GET() {
  try {
    // Verify key exists
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json(
        { success: false, error: "STRIPE_SECRET_KEY not configured" },
        { status: 500 }
      );
    }

    // Initialize Stripe with the secret key
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    // Call stripe.balance.retrieve() to test the key
    const balance = await stripe.balance.retrieve();

    // If we got here, the key works
    return Response.json({
      success: true,
      message: "Stripe API key is valid",
      balance: {
        available: balance.available.length > 0 ? balance.available[0] : null,
        pending: balance.pending.length > 0 ? balance.pending[0] : null,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      {
        success: false,
        error: errorMessage,
        hint: "If 'Invalid API Key provided', generate fresh test keys from Stripe Dashboard",
      },
      { status: 401 }
    );
  }
}
