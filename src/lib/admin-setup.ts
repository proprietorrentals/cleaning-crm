/**
 * Helper utilities for admin and tenant setup
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensure admin is properly initialized in tenant_admins table
 * Returns the tenant_id if successful
 */
export async function ensureAdminInitialized(
  adminClient: SupabaseClient,
  userId: string,
  userEmail: string | undefined
): Promise<string> {
  // Check if already in tenant_admins
  const { data: existingAdmin, error: checkError } = await adminClient
    .from("tenant_admins")
    .select("tenant_id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (checkError) {
    console.error("ensureAdminInitialized: Error checking tenant_admins:", checkError);
    throw new Error(`Failed to check admin status: ${checkError.message}`);
  }

  if (existingAdmin) {
    return existingAdmin.tenant_id;
  }

  // User not in tenant_admins, try to add them
  console.log("ensureAdminInitialized: User not found, attempting to add to default tenant");

  const defaultTenantId = "00000000-0000-0000-0000-000000000001";

  // Ensure default tenant exists
  const { data: defaultTenant, error: tenantCheckError } = await adminClient
    .from("tenants")
    .select("id")
    .eq("id", defaultTenantId)
    .maybeSingle();

  if (tenantCheckError) {
    console.error("ensureAdminInitialized: Error checking default tenant:", tenantCheckError);
    throw new Error(`Failed to check default tenant: ${tenantCheckError.message}`);
  }

  if (!defaultTenant) {
    console.log("ensureAdminInitialized: Creating default tenant");
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
      console.error("ensureAdminInitialized: Error creating default tenant:", createTenantError);
      throw new Error(`Failed to create default tenant: ${createTenantError.message}`);
    }
  }

  // Add user to tenant_admins
  console.log("ensureAdminInitialized: Adding user to tenant_admins");
  const { error: insertError } = await adminClient
    .from("tenant_admins")
    .insert({
      tenant_id: defaultTenantId,
      auth_user_id: userId,
      email: userEmail || "",
    });

  if (insertError) {
    console.error("ensureAdminInitialized: Error inserting into tenant_admins:", insertError);
    throw new Error(`Failed to initialize admin: ${insertError.message}`);
  }

  return defaultTenantId;
}

/**
 * Verify user is an admin and get their tenant_id
 * Automatically initializes if needed
 */
export async function verifyAndGetAdminTenant(
  adminClient: SupabaseClient,
  userId: string,
  userEmail: string | undefined
): Promise<{ tenantId: string; isNewlyInitialized: boolean }> {
  try {
    const tenantId = await ensureAdminInitialized(adminClient, userId, userEmail);
    return { tenantId, isNewlyInitialized: true };
  } catch (err) {
    console.error("verifyAndGetAdminTenant failed:", err);
    throw err;
  }
}
