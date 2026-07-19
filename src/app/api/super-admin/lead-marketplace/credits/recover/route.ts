import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { getLeadCreditPackage } from "@/lib/lead-marketplace/credits";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const bodySchema = z.object({
  checkoutSessionId: z.string().trim().min(1),
});

const checkoutSessionIdSchema = z
  .string()
  .regex(/^cs_(test|live)_[A-Za-z0-9]+$/);

const uuidSchema = z.string().uuid();

type RecoveryDiagnostics = {
  routeReached: boolean;
  sessionFound: boolean;
  paymentPaid: boolean;
  metadataValid: boolean;
  packageValid: boolean;
  tenantValid: boolean;
  purchaseApplied: boolean;
  alreadyCredited: boolean;
  errorCode: string | null;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

function createRecoveryDiagnostics(
  overrides: Partial<RecoveryDiagnostics> = {},
): RecoveryDiagnostics {
  return {
    routeReached: true,
    sessionFound: false,
    paymentPaid: false,
    metadataValid: false,
    packageValid: false,
    tenantValid: false,
    purchaseApplied: false,
    alreadyCredited: false,
    errorCode: null,
    ...overrides,
  };
}

function recoveryResponse(
  status: number,
  message: string,
  diagnostics: RecoveryDiagnostics,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json(
    {
      success: status < 400,
      message,
      diagnostics,
      ...extra,
    },
    { status },
  );
}

async function ensureAccess(diagnostics: RecoveryDiagnostics) {
  const access = await requireSuperAdminAccess();

  if (access.needsAuth) {
    return {
      deniedResponse: recoveryResponse(
        401,
        "Authentication required.",
        diagnostics,
      ),
      access,
    };
  }

  if (access.denied) {
    return {
      deniedResponse: recoveryResponse(
        403,
        "Super Admin access required.",
        diagnostics,
      ),
      access,
    };
  }

  if (access.rpcError) {
    return {
      deniedResponse: recoveryResponse(
        503,
        "Unable to verify Super Admin access.",
        diagnostics,
      ),
      access,
    };
  }

  return { deniedResponse: null, access };
}

export async function POST(request: NextRequest) {
  const diagnostics = createRecoveryDiagnostics();
  const { deniedResponse, access } = await ensureAccess(diagnostics);
  if (deniedResponse) {
    return deniedResponse;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    diagnostics.errorCode = "stripe_not_configured";
    return recoveryResponse(500, "Stripe is not configured.", diagnostics);
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    diagnostics.errorCode = "invalid_payload";
    return recoveryResponse(400, "Invalid request payload.", diagnostics, {
      issues: parsed.error.flatten(),
    });
  }

  const sessionIdParse = checkoutSessionIdSchema.safeParse(
    parsed.data.checkoutSessionId,
  );
  if (!sessionIdParse.success) {
    diagnostics.errorCode = "invalid_checkout_session_id";
    return recoveryResponse(
      400,
      "Invalid Stripe Checkout Session ID.",
      diagnostics,
    );
  }

  const checkoutSessionId = sessionIdParse.data;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  } catch {
    diagnostics.errorCode = "stripe_session_not_found";
    return recoveryResponse(
      404,
      "Unable to retrieve Stripe Checkout Session.",
      diagnostics,
    );
  }

  diagnostics.sessionFound = true;

  if (session.mode !== "payment") {
    diagnostics.errorCode = "invalid_session_mode";
    return recoveryResponse(
      400,
      "Checkout Session is not a payment session.",
      diagnostics,
    );
  }

  if (session.payment_status !== "paid") {
    diagnostics.paymentPaid = false;
    diagnostics.errorCode = "payment_not_paid";
    return recoveryResponse(
      400,
      "Checkout Session has not been paid.",
      diagnostics,
    );
  }

  diagnostics.paymentPaid = true;

  const purchaseType = session.metadata?.purchaseType;
  if (purchaseType !== "lead_marketplace_credits") {
    diagnostics.errorCode = "invalid_purchase_type";
    return recoveryResponse(
      400,
      "Checkout Session is not a marketplace credit purchase.",
      diagnostics,
    );
  }

  const packageId = session.metadata?.packageId ?? "";
  const pkg = getLeadCreditPackage(packageId);
  if (!pkg) {
    diagnostics.errorCode = "invalid_package_id";
    return recoveryResponse(
      400,
      "Invalid package metadata on Checkout Session.",
      diagnostics,
    );
  }

  const tenantIdParse = uuidSchema.safeParse(session.metadata?.tenantId ?? "");
  if (!tenantIdParse.success) {
    diagnostics.errorCode = "invalid_tenant_id";
    return recoveryResponse(
      400,
      "Invalid tenant metadata on Checkout Session.",
      diagnostics,
    );
  }

  const tenantId = tenantIdParse.data;
  diagnostics.metadataValid = true;
  diagnostics.packageValid = true;
  diagnostics.tenantValid = true;
  const packageCredits = Number(session.metadata?.packageCredits ?? "0");
  const packageAmountCents = Number(
    session.metadata?.packageAmountCents ?? "0",
  );

  if (
    packageCredits !== pkg.credits ||
    packageAmountCents !== pkg.amountCents
  ) {
    diagnostics.packageValid = false;
    diagnostics.errorCode = "package_mismatch";
    return recoveryResponse(
      400,
      "Checkout metadata does not match server package pricing.",
      diagnostics,
    );
  }

  if (session.amount_total !== pkg.amountCents) {
    diagnostics.packageValid = false;
    diagnostics.errorCode = "amount_mismatch";
    return recoveryResponse(
      400,
      "Checkout amount does not match package pricing.",
      diagnostics,
    );
  }

  if ((session.currency ?? "").toLowerCase() !== "usd") {
    diagnostics.packageValid = false;
    diagnostics.errorCode = "currency_mismatch";
    return recoveryResponse(
      400,
      "Checkout currency is invalid for marketplace credit purchase.",
      diagnostics,
    );
  }

  const supabase = createAdminSupabaseClient();
  const { data: tenantExists, error: tenantLookupError } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantLookupError || !tenantExists) {
    diagnostics.tenantValid = false;
    diagnostics.errorCode = "tenant_not_found";
    return recoveryResponse(
      400,
      "Tenant metadata does not map to an active company.",
      diagnostics,
    );
  }

  const recoveryEventId = `recovery:${checkoutSessionId}`;
  const actorUserId = access.user?.id ?? null;

  const purchaseResult = await supabase.rpc(
    "marketplace_apply_credit_purchase",
    {
      target_tenant_id: tenantId,
      package_id: pkg.id,
      package_credits: pkg.credits,
      package_amount_cents: pkg.amountCents,
      stripe_event_id: recoveryEventId,
      stripe_checkout_session_id: checkoutSessionId,
      actor_user_id: actorUserId,
    },
  );

  if (purchaseResult.error) {
    diagnostics.errorCode = "purchase_recovery_failed";
    return recoveryResponse(
      500,
      "Unable to recover paid credit purchase.",
      diagnostics,
    );
  }

  const result = purchaseResult.data as {
    applied?: boolean;
    balance?: number;
    transactionId?: string;
    creditsDelta?: number;
  } | null;

  diagnostics.purchaseApplied = result?.applied === true;
  diagnostics.alreadyCredited = result?.applied === false;

  return recoveryResponse(200, "Recovery completed.", diagnostics, {
    recovered: result?.applied === true,
    tenantId,
    checkoutSessionId,
    transaction: result,
  });
}
