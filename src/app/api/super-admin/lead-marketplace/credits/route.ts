import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_TARGET_TENANT_ID,
  listLeadCreditPackages,
} from "@/lib/lead-marketplace/credits";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const adjustmentSchema = z.object({
  action: z.enum(["refund", "adjustment"]),
  tenantId: z.string().uuid().optional(),
  credits: z.number().int().min(1).max(10000).optional(),
  creditsDelta: z.number().int().min(-10000).max(10000).optional(),
  reason: z.string().trim().min(3).max(500),
  referenceKey: z.string().trim().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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

export async function GET(request: NextRequest) {
  const { deniedResponse } = await ensureAccess();
  if (deniedResponse) {
    return deniedResponse;
  }

  const tenantId =
    request.nextUrl.searchParams.get("tenantId") ?? DEFAULT_TARGET_TENANT_ID;
  const supabase = await createServerSupabaseClient();

  const [
    { data: balance, error: balanceError },
    { data: transactions, error: txError },
  ] = await Promise.all([
    supabase
      .from("marketplace_credit_balances")
      .select(
        "tenant_id,balance,lifetime_purchased,lifetime_spent,lifetime_refunded,lifetime_promotional,lifetime_adjustment,last_transaction_at,updated_at",
      )
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("marketplace_credit_transactions")
      .select(
        "id,tenant_id,transaction_type,credits_delta,balance_after,reference_key,reason,metadata,created_by_user_id,created_at",
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (balanceError || txError) {
    return NextResponse.json(
      {
        success: false,
        message:
          balanceError?.message ||
          txError?.message ||
          "Unable to load credits.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    tenantId,
    balance: balance ?? {
      tenant_id: tenantId,
      balance: 0,
      lifetime_purchased: 0,
      lifetime_spent: 0,
      lifetime_refunded: 0,
      lifetime_promotional: 0,
      lifetime_adjustment: 0,
      last_transaction_at: null,
      updated_at: null,
    },
    transactions: transactions ?? [],
    packages: listLeadCreditPackages(),
  });
}

export async function POST(request: NextRequest) {
  const { deniedResponse, access } = await ensureAccess();
  if (deniedResponse) {
    return deniedResponse;
  }

  const userId = access.user?.id;
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = adjustmentSchema.safeParse(body);

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

  const targetTenantId = parsed.data.tenantId ?? DEFAULT_TARGET_TENANT_ID;
  let delta = 0;
  let txType: "refunded" | "adjustment" = "adjustment";

  if (parsed.data.action === "refund") {
    delta = parsed.data.credits ?? 0;
    txType = "refunded";
  } else {
    delta = parsed.data.creditsDelta ?? 0;
    txType = "adjustment";
  }

  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          parsed.data.action === "refund"
            ? "Refund credits must be greater than 0."
            : "Adjustment creditsDelta must be non-zero.",
      },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();
  const result = await supabase.rpc("marketplace_apply_credit_transaction", {
    target_tenant_id: targetTenantId,
    tx_type: txType,
    delta,
    tx_reference_key:
      parsed.data.referenceKey ??
      `${parsed.data.action}:${targetTenantId}:${Date.now()}`,
    tx_reason: parsed.data.reason,
    tx_metadata: {
      ...(parsed.data.metadata ?? {}),
      initiatedBy: access.user?.email ?? userId,
      action: parsed.data.action,
    },
    actor_user_id: userId,
    tx_idempotency_key:
      parsed.data.referenceKey ??
      `${parsed.data.action}:${targetTenantId}:${Date.now()}:${userId}`,
    tx_stripe_event_id: null,
    tx_stripe_session_id: null,
  });

  if (result.error) {
    return NextResponse.json(
      { success: false, message: result.error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    tenantId: targetTenantId,
    transaction: result.data,
  });
}
