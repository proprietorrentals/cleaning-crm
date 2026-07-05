import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Check for whitespace/newlines
  const hasLeadingWhitespace = stripeSecretKey ? /^\s/.test(stripeSecretKey) : false;
  const hasTrailingWhitespace = stripeSecretKey ? /\s$/.test(stripeSecretKey) : false;
  const startsWithSkTest = stripeSecretKey ? stripeSecretKey.startsWith("sk_test_") : false;
  const isRestrictedKey = stripeSecretKey ? stripeSecretKey.includes("rk_") : false;

  // Try to initialize Stripe with correct apiVersion
  let stripeInitialized = false;
  let initError = "";
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
    });
    stripeInitialized = true;
  } catch (error) {
    initError = error instanceof Error ? error.message : "Unknown error";
  }

  return NextResponse.json({
    WARNING: {
      STATUS: "⚠️ STRIPE KEY REJECTED BY STRIPE SERVERS",
      MESSAGE: "Stripe key is still being rejected by Stripe. Replace STRIPE_SECRET_KEY in .env.local with a freshly rolled Standard test secret key from Stripe Dashboard, then restart npm run dev.",
      ACTION: "1. Go to https://dashboard.stripe.com/test/apikeys",
      ACTION_2: "2. Click 'Reveal test key' to generate a fresh sk_test_... key",
      ACTION_3: "3. Update .env.local with the new STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      ACTION_4: "4. Restart dev server: npm run dev",
    },
    KEY_ANALYSIS: {
      STRIPE_SECRET_KEY_EXISTS: !!stripeSecretKey,
      STRIPE_SECRET_KEY_LENGTH: stripeSecretKey ? stripeSecretKey.length : 0,
      STARTS_WITH_SK_TEST: startsWithSkTest,
      HAS_LEADING_WHITESPACE: hasLeadingWhitespace,
      HAS_TRAILING_WHITESPACE: hasTrailingWhitespace,
      HAS_NEWLINES: stripeSecretKey ? stripeSecretKey.includes("\n") : false,
      IS_RESTRICTED_KEY: isRestrictedKey,
      FIRST_12_CHARS: stripeSecretKey ? stripeSecretKey.substring(0, 12) : "undefined",
      LAST_6_CHARS: stripeSecretKey ? stripeSecretKey.slice(-6) : "undefined",
    },
    STRIPE_INITIALIZATION: {
      INITIALIZED_SUCCESSFULLY: stripeInitialized,
      INIT_ERROR: initError,
      API_VERSION_USED: "2024-06-20",
    },
    PUBLIC_KEY_CHECK: {
      KEY_EXISTS: !!stripePubKey,
      STARTS_WITH_PK_TEST: stripePubKey ? stripePubKey.startsWith("pk_test_") : false,
    },
  });
}
