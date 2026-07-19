import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const NO_TENANT_ASSOCIATION_MESSAGE =
  "No company organization is associated with this account.";

type TenantResolutionResult =
  | { ok: true; tenantId: string }
  | { ok: false; status: number; message: string };

type IntroCreditEnsureResult =
  | { ok: true; granted: boolean }
  | { ok: false; message: string };

const INTRO_CREDIT_REFERENCE_KEY = "intro_free_credit";

export async function resolveAuthenticatedMarketplaceTenant(
  userId: string,
): Promise<TenantResolutionResult> {
  const supabase = await createServerSupabaseClient();

  const [
    { data: adminRow, error: adminError },
    { data: employeeRow, error: employeeError },
  ] = await Promise.all([
    supabase
      .from("tenant_admins")
      .select("tenant_id")
      .eq("auth_user_id", userId)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("tenant_id,role,is_active")
      .eq("auth_user_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (adminError) {
    return { ok: false, status: 500, message: adminError.message };
  }

  if (employeeError) {
    return { ok: false, status: 500, message: employeeError.message };
  }

  const tenantId = adminRow?.tenant_id ?? employeeRow?.tenant_id ?? null;
  if (!tenantId) {
    return {
      ok: false,
      status: 403,
      message: NO_TENANT_ASSOCIATION_MESSAGE,
    };
  }

  return { ok: true, tenantId };
}

export async function ensureIntroMarketplaceCreditForTenant(
  tenantId: string,
): Promise<IntroCreditEnsureResult> {
  const supabase = createAdminSupabaseClient();

  const { data: existingIntroEntries, error: existingIntroError } =
    await supabase
      .from("marketplace_credit_transactions")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("transaction_type", "promotional")
      .eq("reference_key", INTRO_CREDIT_REFERENCE_KEY)
      .limit(1);

  if (existingIntroError) {
    return { ok: false, message: existingIntroError.message };
  }

  if ((existingIntroEntries?.length ?? 0) > 0) {
    return { ok: true, granted: false };
  }

  const { error } = await supabase.rpc("marketplace_grant_intro_credit", {
    target_tenant_id: tenantId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, granted: false };
    }

    return { ok: false, message: error.message };
  }

  return { ok: true, granted: true };
}
