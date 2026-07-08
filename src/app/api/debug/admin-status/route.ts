import "@/lib/globals-polyfill";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/debug/admin-status
 *
 * Debug endpoint to diagnose admin verification issues.
 * Shows:
 * - Current user ID
 * - Whether user is in tenant_admins
 * - Current tenant_admins records
 * - Any errors encountered
 *
 * **SECURITY**: Remove this endpoint before production!
 */
export async function GET() {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const adminClient = createAdminSupabaseClient();

    // Get current user
    const { data: { user }, error: sessionError } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        status: "not_authenticated",
        error: sessionError?.message || "No session",
      });
    }

    console.log("DEBUG: Current user ID:", user.id, "Email:", user.email);

    // Check if user is in tenant_admins
    const { data: adminRecord, error: adminQueryError } = await adminClient
      .from("tenant_admins")
      .select("id, tenant_id, auth_user_id, email")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    console.log("DEBUG: tenant_admins query result:", {
      error: adminQueryError,
      data: adminRecord,
    });

    // Get all tenant_admins records (for debugging)
    const { data: allAdmins, error: allAdminsError } = await adminClient
      .from("tenant_admins")
      .select("id, tenant_id, auth_user_id, email");

    // Check if tenant_admins table exists (optional debug info)
    let schemaInfo = null;
    try {
      const { data, error } = await adminClient.rpc("check_table_exists", {
        table_name: "tenant_admins",
        schema_name: "public",
      });
      schemaInfo = error ? null : data;
    } catch {
      // RPC not available, skip this check
    }

    // Get tenants
    const { data: tenants, error: tenantsError } = await adminClient
      .from("tenants")
      .select("id, company_name");

    return NextResponse.json({
      status: "debug_info",
      current_user: {
        id: user.id,
        email: user.email,
      },
      admin_check: {
        in_tenant_admins: !!adminRecord,
        record: adminRecord,
        query_error: adminQueryError?.message || null,
      },
      all_admins: {
        count: allAdmins?.length || 0,
        error: allAdminsError?.message || null,
        records: allAdmins || [],
      },
      tenants: {
        count: tenants?.length || 0,
        error: tenantsError?.message || null,
        records: tenants || [],
      },
      table_exists: schemaInfo,
      diagnostics: {
        user_not_found_in_tenant_admins: !adminRecord,
        default_tenant_exists: tenants?.some(t => t.id === "00000000-0000-0000-0000-000000000001"),
        next_steps: !adminRecord
          ? [
              "User is NOT in tenant_admins table",
              "Will auto-promote during next invite attempt",
              "Or manually insert into tenant_admins",
            ]
          : [
              "User IS in tenant_admins",
              "Can proceed with employee invite",
            ],
      },
    });
  } catch (err) {
    console.error("debug-admin-status error:", err);
    return NextResponse.json({
      error: "Debug query failed",
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
