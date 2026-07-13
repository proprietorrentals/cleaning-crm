import type { SupabaseClient } from "@supabase/supabase-js";

export type ActiveEmployeeProfile = {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string | null;
  is_active: boolean;
};

/**
 * Resolves the current authenticated user to their active employees row.
 * Returns null when no linked employee exists.
 */
export async function getActiveEmployeeByAuthUserId(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<{ profile: ActiveEmployeeProfile | null; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("employees")
    .select("id,tenant_id,first_name,last_name,role,department,is_active")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    return { profile: null, errorMessage: error.message };
  }

  if (!data || !data.is_active || !data.tenant_id) {
    return { profile: null, errorMessage: null };
  }

  return { profile: data, errorMessage: null };
}