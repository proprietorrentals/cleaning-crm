import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const NO_TENANT_ASSOCIATION_MESSAGE =
  "No company organization is associated with this account.";

type TenantResolutionResult =
  | {
      ok: true;
      tenantId: string;
      resolutionSource: "tenant_admins" | "employees";
      tenantAdminMatchCount: number;
      employeeMatchCount: number;
    }
  | { ok: false; status: number; message: string };

type IntroCreditEnsureResult =
  | {
      ok: true;
      granted: boolean;
      attempted: boolean;
      introLedgerExists: boolean;
      ensureIntroCreditErrorCode: null;
    }
  | {
      ok: false;
      message: string;
      attempted: boolean;
      introLedgerExists: boolean;
      ensureIntroCreditErrorCode: string | null;
    };

const INTRO_CREDIT_REFERENCE_KEY = "intro_free_credit";

export async function resolveAuthenticatedMarketplaceTenant(
  userId: string,
): Promise<TenantResolutionResult> {
  const supabase = createAdminSupabaseClient();

  const [
    { data: adminRows, error: adminError, count: adminCount },
    { data: employeeRows, error: employeeError, count: employeeCount },
  ] = await Promise.all([
    supabase
      .from("tenant_admins")
      .select("tenant_id", { count: "exact" })
      .eq("auth_user_id", userId)
      .not("tenant_id", "is", null)
      .limit(10),
    supabase
      .from("employees")
      .select("tenant_id", { count: "exact" })
      .eq("auth_user_id", userId)
      .eq("is_active", true)
      .not("tenant_id", "is", null)
      .limit(10),
  ]);

  if (adminError) {
    return { ok: false, status: 500, message: adminError.message };
  }

  if (employeeError) {
    return { ok: false, status: 500, message: employeeError.message };
  }

  const tenantAdminMatchCount = adminCount ?? adminRows?.length ?? 0;
  const employeeMatchCount = employeeCount ?? employeeRows?.length ?? 0;

  const adminTenantId = adminRows?.[0]?.tenant_id ?? null;
  const employeeTenantId = employeeRows?.[0]?.tenant_id ?? null;
  const tenantId = adminTenantId ?? employeeTenantId ?? null;

  if (!tenantId) {
    return {
      ok: false,
      status: 403,
      message: NO_TENANT_ASSOCIATION_MESSAGE,
    };
  }

  return {
    ok: true,
    tenantId,
    resolutionSource: adminTenantId ? "tenant_admins" : "employees",
    tenantAdminMatchCount,
    employeeMatchCount,
  };
}

export async function ensureIntroMarketplaceCreditForTenant(
  tenantId: string,
): Promise<IntroCreditEnsureResult> {
  const supabase = createAdminSupabaseClient();
  const introIdempotencyKey = `intro:${tenantId}`;

  const { data: existingIntroEntries, error: existingIntroError } =
    await supabase
      .from("marketplace_credit_transactions")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("transaction_type", "promotional")
      .or(
        `idempotency_key.eq.${introIdempotencyKey},reference_key.eq.${INTRO_CREDIT_REFERENCE_KEY}`,
      )
      .limit(1);

  if (existingIntroError) {
    return {
      ok: false,
      message: existingIntroError.message,
      attempted: false,
      introLedgerExists: false,
      ensureIntroCreditErrorCode: existingIntroError.code ?? null,
    };
  }

  const introLedgerExists = (existingIntroEntries?.length ?? 0) > 0;
  if (introLedgerExists) {
    return {
      ok: true,
      granted: false,
      attempted: false,
      introLedgerExists: true,
      ensureIntroCreditErrorCode: null,
    };
  }

  const { error } = await supabase.rpc("marketplace_grant_intro_credit", {
    target_tenant_id: tenantId,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: true,
        granted: false,
        attempted: true,
        introLedgerExists: true,
        ensureIntroCreditErrorCode: null,
      };
    }

    return {
      ok: false,
      message: error.message,
      attempted: true,
      introLedgerExists: false,
      ensureIntroCreditErrorCode: error.code ?? null,
    };
  }

  return {
    ok: true,
    granted: true,
    attempted: true,
    introLedgerExists: false,
    ensureIntroCreditErrorCode: null,
  };
}
