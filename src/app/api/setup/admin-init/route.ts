import "@/lib/globals-polyfill";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/setup/admin-init
 *
 * One-time setup endpoint to initialize an admin account.
 * Use this if:
 * - Admin signed up before multi-tenant support
 * - Migration didn't populate tenant_admins
 * - Need to manually add admin to system
 *
 * This endpoint:
 * 1. Gets current user
 * 2. Creates default tenant if needed
 * 3. Adds user to tenant_admins if not already there
 * 4. Creates settings row for tenant
 *
 * **SECURITY**: Consider removing or protecting this endpoint in production
 */
export async function POST() {
  try {
    const serverSupabase = await createServerSupabaseClient();

    // Get current user
    const { data: { user }, error: sessionError } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        error: "Unauthorized: Please log in first",
      }, { status: 401 });
    }

    console.log("admin-init: Setting up admin for user:", user.id?.substring(0, 8) + "...", user.email);

    // ─── Create admin client (may fail if env vars not set)
    let adminClient;
    try {
      adminClient = createAdminSupabaseClient();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("admin-init: Failed to create admin client:", errorMessage);
      return NextResponse.json({
        error: `Server configuration error: ${errorMessage}. Check that SUPABASE_SERVICE_ROLE_KEY is set in environment variables.`,
      }, { status: 500 });
    }

    // Step 1: Ensure default tenant exists
    const { data: defaultTenant, error: tenantCheckError } = await adminClient
      .from("tenants")
      .select("id")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .maybeSingle();

    if (tenantCheckError) {
      console.error("admin-init: Error checking default tenant:", tenantCheckError);
      return NextResponse.json({
        error: `Failed to check default tenant: ${tenantCheckError.message}`,
      }, { status: 500 });
    }

    let tenantId = "00000000-0000-0000-0000-000000000001";

    if (!defaultTenant) {
      console.log("admin-init: Creating default tenant");
      const { data: createdTenant, error: createTenantError } = await adminClient
        .from("tenants")
        .insert({
          id: tenantId,
          company_name: "Default Company",
          owner_email: user.email,
          slug: "default",
          plan: "professional",
          status: "active",
        })
        .select("id")
        .single();

      if (createTenantError) {
        console.error("admin-init: Error creating default tenant:", createTenantError);
        return NextResponse.json({
          error: `Failed to create default tenant: ${createTenantError.message}`,
        }, { status: 500 });
      }

      if (createdTenant) {
        tenantId = createdTenant.id;
      }
    }

    // Step 2: Check if user is already in tenant_admins
    const { data: existingAdmin, error: adminCheckError } = await adminClient
      .from("tenant_admins")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (adminCheckError) {
      console.error("admin-init: Error checking tenant_admins:", adminCheckError);
      return NextResponse.json({
        error: `Failed to check admin status: ${adminCheckError.message}`,
      }, { status: 500 });
    }

    if (existingAdmin) {
      console.log("admin-init: User already in tenant_admins");
      return NextResponse.json({
        status: "already_initialized",
        message: "Admin account already initialized",
      });
    }

    // Step 3: Add user to tenant_admins
    console.log("admin-init: Adding user to tenant_admins for tenant:", tenantId);
    const { error: addAdminError } = await adminClient
      .from("tenant_admins")
      .insert({
        tenant_id: tenantId,
        auth_user_id: user.id,
        email: user.email || "",
      });

    if (addAdminError) {
      console.error("admin-init: Error adding user to tenant_admins:", addAdminError);
      return NextResponse.json({
        error: `Failed to initialize admin: ${addAdminError.message}`,
      }, { status: 500 });
    }

    // Step 4: Ensure settings row exists
    const { error: settingsError } = await adminClient
      .from("settings")
      .insert({
        tenant_id: tenantId,
        company_name: "My Company",
      })
      .select("id")
      .maybeSingle();

    if (settingsError && !settingsError.message?.includes("duplicate")) {
      console.error("admin-init: Error creating settings:", settingsError);
      // Don't fail if settings already exists
    }

    console.log("admin-init: Success - Admin initialized for tenant:", tenantId);

    return NextResponse.json({
      status: "success",
      message: "Admin account initialized successfully",
      tenant_id: tenantId,
      user_email: user.email,
      next_step: "You can now invite employees to the portal",
    });
  } catch (err) {
    console.error("admin-init error:", err);
    return NextResponse.json({
      error: "Unexpected server error",
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
