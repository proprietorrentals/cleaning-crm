/**
 * Helper utilities for admin and tenant setup
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensure admin is properly initialized in tenant_admins table
 * Returns the tenant_id if successful
 *
 * This function will:
 * 1. Check if user is already in tenant_admins
 * 2. If not, create default tenant (if missing)
 * 3. Add user to tenant_admins for default tenant
 */
export async function ensureAdminInitialized(
  adminClient: SupabaseClient,
  userId: string,
  userEmail: string | undefined
): Promise<string> {
  console.log("ensureAdminInitialized: Starting for user ID:", userId?.substring(0, 8) + "...");

  // Check if already in tenant_admins
  const { data: existingAdmin, error: checkError } = await adminClient
    .from("tenant_admins")
    .select("tenant_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (checkError) {
    const errorMsg = `Failed to check admin status: ${checkError.message}`;
    console.error("ensureAdminInitialized:", errorMsg, {
      code: checkError.code,
      details: (checkError as any).details,
    });
    throw new Error(errorMsg);
  }

  if (existingAdmin) {
    console.log("ensureAdminInitialized: User already initialized for tenant:", existingAdmin.tenant_id?.substring(0, 8) + "...");
    return existingAdmin.tenant_id;
  }

  // User not in tenant_admins, try to add them
  console.log("ensureAdminInitialized: User not found in tenant_admins, attempting to initialize");

  const defaultTenantId = "00000000-0000-0000-0000-000000000001";

  // Ensure default tenant exists
  const { data: defaultTenant, error: tenantCheckError } = await adminClient
    .from("tenants")
    .select("id")
    .eq("id", defaultTenantId)
    .maybeSingle();

  if (tenantCheckError) {
    const errorMsg = `Failed to check default tenant: ${tenantCheckError.message}`;
    console.error("ensureAdminInitialized:", errorMsg);
    throw new Error(errorMsg);
  }

  if (!defaultTenant) {
    console.log("ensureAdminInitialized: Default tenant does not exist, creating...");
    const { error: createTenantError } = await adminClient
      .from("tenants")
      .insert({
        id: defaultTenantId,
        company_name: "Default Company",
        owner_email: userEmail || "admin@localhost",
        slug: "default",
        plan: "professional",
        status: "active",
      });

    if (createTenantError) {
      const errorMsg = `Failed to create default tenant: ${createTenantError.message}`;
      console.error("ensureAdminInitialized:", errorMsg);
      throw new Error(errorMsg);
    }
    console.log("ensureAdminInitialized: Default tenant created successfully");
  }

  // Add user to tenant_admins
  console.log("ensureAdminInitialized: Adding user to tenant_admins for default tenant");
  const { error: insertError } = await adminClient
    .from("tenant_admins")
    .insert({
      tenant_id: defaultTenantId,
      auth_user_id: userId,
      email: userEmail || "",
    });

  if (insertError) {
    const errorMsg = `Failed to initialize admin: ${insertError.message}`;
    console.error("ensureAdminInitialized:", errorMsg, {
      code: insertError.code,
      details: (insertError as any).details,
    });
    throw new Error(errorMsg);
  }

  console.log("ensureAdminInitialized: Success - user added to tenant_admins");
  return defaultTenantId;
}
