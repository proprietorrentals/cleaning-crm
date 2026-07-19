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

  const tenantIdParse = uuidSchema.safeParse(session.metadata?.tenantId ?? "");
  if (!tenantIdParse.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid tenant metadata on Checkout Session.",
      },
      { status: 400 },
    );
  }

  const tenantId = tenantIdParse.data;
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

  const supabase = createAdminSupabaseClient();
  const { data: tenantExists, error: tenantLookupError } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantLookupError || !tenantExists) {
    return NextResponse.json(
      {
        success: false,
        message: "Tenant metadata does not map to an active company.",
      },
      { status: 400 },
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
    tenantId,
    checkoutSessionId,
    transaction: result,
  });
}
