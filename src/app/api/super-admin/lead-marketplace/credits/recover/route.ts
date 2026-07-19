import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { getLeadCreditPackage } from "@/lib/lead-marketplace/credits";
import { resolveAuthenticatedMarketplaceTenant } from "@/lib/lead-marketplace/tenant-resolution";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const bodySchema = z.object({
  checkoutSessionId: z.string().trim().min(1),
  legacyPreTenantMetadataConfirmed: z.boolean().optional().default(false),
});

const checkoutSessionIdSchema = z
  .string()
  .regex(/^cs_(test|live)_[A-Za-z0-9]+$/);

const uuidSchema = z.string().uuid();

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

async function ensureAccess() {
  const access = await requireSuperAdminAccess();

  if (access.needsAuth) {
    return {
      deniedResponse: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      ),
      access,
    };
  }

  if (access.denied) {
    return {
      deniedResponse: NextResponse.json(
        { success: false, message: "Super Admin access required." },
        { status: 403 },
      ),
      access,
    };
  }

  if (access.rpcError) {
    return {
      deniedResponse: NextResponse.json(
        { success: false, message: "Unable to verify Super Admin access." },
        { status: 503 },
      ),
      access,
    };
  }

  return { deniedResponse: null, access };
}

export async function POST(request: NextRequest) {
  const { deniedResponse, access } = await ensureAccess();
  if (deniedResponse) {
    return deniedResponse;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { success: false, message: "Stripe is not configured." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const sessionIdParse = checkoutSessionIdSchema.safeParse(
    parsed.data.checkoutSessionId,
  );
  if (!sessionIdParse.success) {
    return NextResponse.json(
      { success: false, message: "Invalid Stripe Checkout Session ID." },
      { status: 400 },
    );
  }

  const checkoutSessionId = sessionIdParse.data;
  const legacyPreTenantMetadataConfirmed =
    parsed.data.legacyPreTenantMetadataConfirmed;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve Stripe Checkout Session.",
      },
      { status: 404 },
    );
  }

  if (session.mode !== "payment") {
    return NextResponse.json(
      { success: false, message: "Checkout Session is not a payment session." },
      { status: 400 },
    );
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json(
      { success: false, message: "Checkout Session has not been paid." },
      { status: 400 },
    );
  }

  const purchaseType = session.metadata?.purchaseType;
  if (purchaseType !== "lead_marketplace_credits") {
    return NextResponse.json(
      {
        success: false,
        message: "Checkout Session is not a marketplace credit purchase.",
      },
      { status: 400 },
    );
  }

  const packageId = session.metadata?.packageId ?? "";
  const pkg = getLeadCreditPackage(packageId);
  if (!pkg) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid package metadata on Checkout Session.",
      },
      { status: 400 },
    );
  }

  const packageCredits = Number(session.metadata?.packageCredits ?? "0");
  const packageAmountCents = Number(
    session.metadata?.packageAmountCents ?? "0",
  );

  if (
    packageCredits !== pkg.credits ||
    packageAmountCents !== pkg.amountCents
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Checkout metadata does not match server package pricing.",
      },
      { status: 400 },
    );
  }

  if (session.amount_total !== pkg.amountCents) {
    return NextResponse.json(
      {
        success: false,
        message: "Checkout amount does not match package pricing.",
      },
      { status: 400 },
    );
  }

  if ((session.currency ?? "").toLowerCase() !== "usd") {
    return NextResponse.json(
      {
        success: false,
        message:
          "Checkout currency is invalid for marketplace credit purchase.",
      },
      { status: 400 },
    );
  }

  const superAdminTenantResolution =
    await resolveAuthenticatedMarketplaceTenant(access.user?.id ?? "");
  if (!superAdminTenantResolution.ok) {
    return NextResponse.json(
      {
        success: false,
        message: superAdminTenantResolution.message,
      },
      { status: superAdminTenantResolution.status },
    );
  }

  const resolvedTenantId = superAdminTenantResolution.tenantId;
  const supabase = createAdminSupabaseClient();
  const rawTenantMetadata = session.metadata?.tenantId?.trim() ?? "";
  const parsedTenantMetadata = rawTenantMetadata
    ? uuidSchema.safeParse(rawTenantMetadata)
    : null;
  const sessionTenantId = parsedTenantMetadata?.success
    ? parsedTenantMetadata.data
    : null;
  const hasValidSessionTenantMetadata =
    sessionTenantId !== null && sessionTenantId !== ZERO_UUID;

  if (hasValidSessionTenantMetadata) {
    if (sessionTenantId !== resolvedTenantId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Checkout Session tenant metadata does not match the authenticated Super Admin tenant.",
        },
        { status: 400 },
      );
    }

    const { data: existingTransaction, error: existingTransactionError } =
      await supabase
        .from("marketplace_credit_transactions")
        .select("id,transaction_type,balance_after,credits_delta")
        .eq("stripe_checkout_session_id", checkoutSessionId)
        .maybeSingle();

    if (existingTransactionError) {
      return NextResponse.json(
        {
          success: false,
          message: existingTransactionError.message,
        },
        { status: 500 },
      );
    }

    if (existingTransaction) {
      return NextResponse.json({
        success: true,
        recovered: false,
        alreadyCredited: true,
        tenantId: resolvedTenantId,
        checkoutSessionId,
        transaction: {
          applied: false,
          transactionId: existingTransaction.id,
          creditsDelta: existingTransaction.credits_delta,
          balance: existingTransaction.balance_after,
          transactionType: existingTransaction.transaction_type,
        },
      });
    }

    const purchaseResult = await supabase.rpc(
      "marketplace_apply_credit_transaction",
      {
        target_tenant_id: resolvedTenantId,
        tx_type: "purchased",
        delta: pkg.credits,
        tx_reference_key: `stripe_purchase:${checkoutSessionId}`,
        tx_reason: `Stripe package purchase: ${pkg.id}`,
        tx_metadata: {
          packageId: pkg.id,
          credits: pkg.credits,
          amountCents: pkg.amountCents,
          currency: "usd",
          recoveryMode: "legacy_pre_tenant_metadata",
          legacyTenantFallback: true,
          legacyTenantFallbackConfirmed: true,
          legacyTenantResolutionSource:
            superAdminTenantResolution.resolutionSource,
        },
        actor_user_id: access.user?.id ?? null,
        tx_idempotency_key: `stripe:recovery:${checkoutSessionId}`,
        tx_stripe_event_id: `recovery:${checkoutSessionId}`,
        tx_stripe_session_id: checkoutSessionId,
      },
    );

    if (purchaseResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to recover paid credit purchase.",
        },
        { status: 500 },
      );
    }

    const result = purchaseResult.data as {
      applied?: boolean;
      balance?: number;
      transactionId?: string;
      creditsDelta?: number;
    } | null;

    return NextResponse.json({
      success: true,
      recovered: result?.applied === true,
      alreadyCredited: result?.applied === false,
      tenantId: resolvedTenantId,
      checkoutSessionId,
      transaction: result,
      legacyTenantFallback: true,
    });
  }

  if (!legacyPreTenantMetadataConfirmed) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Legacy recovery requires explicit confirmation that this is a pre-tenant-metadata purchase.",
      },
      { status: 400 },
    );
  }

  const { data: tenantExists, error: tenantLookupError } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", resolvedTenantId)
    .maybeSingle();

  if (tenantLookupError || !tenantExists) {
    return NextResponse.json(
      {
        success: false,
        message: "Authenticated Super Admin tenant could not be resolved.",
      },
      { status: 400 },
    );
  }

  const existingTransactionLookup = await supabase
    .from("marketplace_credit_transactions")
    .select("id,transaction_type,balance_after,credits_delta")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle();

  if (existingTransactionLookup.error) {
    return NextResponse.json(
      {
        success: false,
        message: existingTransactionLookup.error.message,
      },
      { status: 500 },
    );
  }

  if (existingTransactionLookup.data) {
    return NextResponse.json({
      success: true,
      recovered: false,
      alreadyCredited: true,
      tenantId: resolvedTenantId,
      checkoutSessionId,
      transaction: {
        applied: false,
        transactionId: existingTransactionLookup.data.id,
        creditsDelta: existingTransactionLookup.data.credits_delta,
        balance: existingTransactionLookup.data.balance_after,
        transactionType: existingTransactionLookup.data.transaction_type,
      },
    });
  }

  const actorUserId = access.user?.id ?? null;

  const purchaseResult = await supabase.rpc(
    "marketplace_apply_credit_transaction",
    {
      target_tenant_id: resolvedTenantId,
      tx_type: "purchased",
      delta: pkg.credits,
      tx_reference_key: `stripe_purchase:${checkoutSessionId}`,
      tx_reason: `Stripe package purchase: ${pkg.id}`,
      tx_metadata: {
        packageId: pkg.id,
        credits: pkg.credits,
        amountCents: pkg.amountCents,
        currency: "usd",
      },
      actor_user_id: actorUserId,
      tx_idempotency_key: `stripe:recovery:${checkoutSessionId}`,
      tx_stripe_event_id: `recovery:${checkoutSessionId}`,
      tx_stripe_session_id: checkoutSessionId,
    },
  );

  if (purchaseResult.error) {
    return NextResponse.json(
      { success: false, message: "Unable to recover paid credit purchase." },
      { status: 500 },
    );
  }

  const result = purchaseResult.data as {
    applied?: boolean;
    balance?: number;
    transactionId?: string;
    creditsDelta?: number;
  } | null;

  return NextResponse.json({
    success: true,
    recovered: result?.applied === true,
    alreadyCredited: result?.applied === false,
    tenantId: resolvedTenantId,
    checkoutSessionId,
    transaction: result,
    legacyTenantFallback: true,
  });
}
