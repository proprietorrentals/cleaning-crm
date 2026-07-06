import "@/lib/globals-polyfill";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  const result: any = {
    ENV_KEYS: {
      SECRET_KEY_EXISTS: !!secretKey,
      SECRET_KEY_LENGTH: secretKey?.length || 0,
      SECRET_KEY_PREFIX: secretKey?.substring(0, 16) || "missing",
      SECRET_KEY_SUFFIX: secretKey?.slice(-8) || "missing",
      PUBLISHABLE_KEY_EXISTS: !!publishableKey,
      PUBLISHABLE_KEY_LENGTH: publishableKey?.length || 0,
      PUBLISHABLE_KEY_PREFIX: publishableKey?.substring(0, 16) || "missing",
      PUBLISHABLE_KEY_SUFFIX: publishableKey?.slice(-8) || "missing",
    },
    KEY_VALIDATION: {
      SECRET_KEY_IS_TEST_MODE: secretKey?.startsWith("sk_test_") || false,
      PUBLISHABLE_KEY_IS_TEST_MODE: publishableKey?.startsWith("pk_test_") || false,
      KEYS_MATCH_ACCOUNT_ID: false,
      KEYS_APPEAR_PAIRED: false,
    },
    STRIPE_SDK: {
      INITIALIZATION_SUCCESS: false,
      ERROR: "",
    },
    TEST_REQUEST: {
      SUCCESS: false,
      ERROR: "",
      METHOD: "Attempting to list products",
    },
  };

  // Check if account IDs match (both should have same account ID after prefix)
  if (secretKey && publishableKey) {
    const secretAccountId = secretKey.substring(8, 20); // Extract after "sk_test_"
    const pubAccountId = publishableKey.substring(8, 20); // Extract after "pk_test_"
    result.KEY_VALIDATION.KEYS_MATCH_ACCOUNT_ID = secretAccountId === pubAccountId;
    result.KEY_VALIDATION.SECRET_ACCOUNT_ID = secretAccountId;
    result.KEY_VALIDATION.PUBLIC_ACCOUNT_ID = pubAccountId;

    // Check if keys appear to be paired (non-test keys usually are different patterns)
    result.KEY_VALIDATION.KEYS_APPEAR_PAIRED = secretKey.length > 50 && publishableKey.length > 50;
  }

  // Try to initialize Stripe
  try {
    const stripe = new Stripe(secretKey || "", {
      apiVersion: "2024-06-20",
    });
    result.STRIPE_SDK.INITIALIZATION_SUCCESS = true;

    // Attempt a simple API call to verify the key works
    try {
      const products = await stripe.products.list({ limit: 1 });
      result.TEST_REQUEST.SUCCESS = true;
      result.TEST_REQUEST.METHOD = "Successfully listed products";
      result.TEST_REQUEST.PRODUCTS_COUNT = products.data.length;
    } catch (listError: any) {
      result.TEST_REQUEST.ERROR = listError?.message || "Unknown error";
      result.TEST_REQUEST.ERROR_CODE = listError?.code || "unknown";
      result.TEST_REQUEST.ERROR_TYPE = listError?.type || "unknown";
    }
  } catch (initError: any) {
    result.STRIPE_SDK.ERROR = initError?.message || "Unknown initialization error";
    result.STRIPE_SDK.ERROR_TYPE = initError?.type || "unknown";
  }

  // Recommendations
  const recommendations: string[] = [];

  if (!result.ENV_KEYS.SECRET_KEY_EXISTS || !result.ENV_KEYS.PUBLISHABLE_KEY_EXISTS) {
    recommendations.push("❌ Missing Stripe keys in .env.local");
  }

  if (!result.KEY_VALIDATION.SECRET_KEY_IS_TEST_MODE || !result.KEY_VALIDATION.PUBLISHABLE_KEY_IS_TEST_MODE) {
    recommendations.push("❌ Keys are not in test mode (should start with sk_test_ and pk_test_)");
  }

  if (!result.KEY_VALIDATION.KEYS_MATCH_ACCOUNT_ID) {
    recommendations.push("⚠️ Keys have different account IDs - they may not be paired correctly");
  }

  if (!result.STRIPE_SDK.INITIALIZATION_SUCCESS) {
    recommendations.push("❌ Failed to initialize Stripe SDK");
  }

  if (!result.TEST_REQUEST.SUCCESS && result.STRIPE_SDK.INITIALIZATION_SUCCESS) {
    recommendations.push("❌ Stripe SDK initialized but API call failed - key may be invalid, expired, or restricted");
    recommendations.push("   → Consider generating a fresh test secret key from Stripe Dashboard");
  }

  if (result.TEST_REQUEST.SUCCESS) {
    recommendations.push("✅ All checks passed! Stripe key is valid and working.");
  }

  result.RECOMMENDATIONS = recommendations;

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
