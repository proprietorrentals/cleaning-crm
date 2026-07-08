import "@/lib/globals-polyfill";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureAdminInitialized } from "@/lib/admin-setup";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/employee-invite
 *
 * Creates a Supabase auth user for an existing employee record and links them.
 * Called by the admin when they want to give portal access to an employee
 * who does not yet have an auth account.
 *
 * Body: { employeeId, email, tempPassword }
 *
 * Flow:
 * 1. Verify caller is authenticated
 * 2. Ensure caller is in tenant_admins (auto-initialize if needed)
 * 3. Verify employee belongs to caller's tenant
 * 4. Create Supabase Auth user
 * 5. Link auth_user_id to employee record
 */
export async function POST(req: NextRequest) {
  try {
    const { employeeId, email, tempPassword } = await req.json() as {
      employeeId: string;
      email: string;
      tempPassword: string;
    };

    // ─── VALIDATION ───────────────────────────────────────────────────────────

    if (!employeeId || !email || !tempPassword) {
      return NextResponse.json({
        error: "Missing required fields: employeeId, email, tempPassword",
      }, { status: 400 });
    }

    if (tempPassword.length < 8) {
      return NextResponse.json({
        error: "Password must be at least 8 characters",
      }, { status: 400 });
    }

    // ─── STEP 1: VERIFY CALLER IS AUTHENTICATED ───────────────────────────────

    const serverSupabase = await createServerSupabaseClient();
    const { data: { user }, error: sessionError } = await serverSupabase.auth.getUser();

    if (sessionError || !user) {
      console.warn("employee-invite: No authenticated session");
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    console.log("employee-invite: Caller user ID:", user.id, "Email:", user.email);

    // ─── STEP 2: ENSURE CALLER IS IN tenant_admins ────────────────────────────
    // This will auto-initialize the admin if needed

    const adminClient = createAdminSupabaseClient();
    let adminTenantId: string;

    try {
      adminTenantId = await ensureAdminInitialized(adminClient, user.id, user.email);
      console.log("employee-invite: Admin verified/initialized for tenant:", adminTenantId);
    } catch (err) {
      console.error("employee-invite: Failed to ensure admin initialized:", err);
      return NextResponse.json({
        error: `Failed to verify admin privileges: ${err instanceof Error ? err.message : String(err)}`,
      }, { status: 403 });
    }

    // ─── STEP 3: VERIFY EMPLOYEE EXISTS AND BELONGS TO ADMIN'S TENANT ─────────

    const { data: employee, error: employeeQueryError } = await adminClient
      .from("employees")
      .select("id, auth_user_id, tenant_id, first_name, last_name, email, is_active, status")
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeQueryError) {
      console.error("employee-invite: Error querying employee:", employeeQueryError);
      return NextResponse.json({
        error: "Failed to lookup employee record",
      }, { status: 500 });
    }

    if (!employee) {
      console.warn("employee-invite: Employee not found:", employeeId);
      return NextResponse.json({
        error: "Employee not found",
      }, { status: 404 });
    }

    // Verify employee is in the admin's tenant
    if (employee.tenant_id !== adminTenantId) {
      console.warn(
        "employee-invite: Tenant mismatch - employee tenant:",
        employee.tenant_id,
        "admin tenant:",
        adminTenantId
      );
      return NextResponse.json({
        error: "Employee not found in your tenant",
      }, { status: 404 });
    }

    console.log("employee-invite: Employee verified:", employee.first_name, employee.last_name);

    // Check if already linked
    if (employee.auth_user_id) {
      console.warn("employee-invite: Employee already has auth user:", employee.auth_user_id);
      return NextResponse.json({
        error: "Employee already has a portal account",
      }, { status: 409 });
    }

    // ─── STEP 4: CREATE SUPABASE AUTH USER ────────────────────────────────────

    console.log("employee-invite: Creating auth user for email:", email);
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: "employee" },
    });

    if (authError) {
      console.error("employee-invite: Failed to create auth user:", authError);
      return NextResponse.json({
        error: `Failed to create account: ${authError.message}`,
      }, { status: 400 });
    }

    if (!authData.user?.id) {
      console.error("employee-invite: Auth user created but no ID returned");
      return NextResponse.json({
        error: "Failed to create account (no ID returned)",
      }, { status: 500 });
    }

    console.log("employee-invite: Auth user created:", authData.user.id);

    // ─── STEP 5: LINK AUTH USER TO EMPLOYEE RECORD ────────────────────────────

    console.log("employee-invite: Linking employee to auth user");
    const { error: updateError } = await adminClient
      .from("employees")
      .update({
        auth_user_id: authData.user.id,
        is_active: true,
        status: "Active",
      })
      .eq("id", employeeId);

    if (updateError) {
      console.error("employee-invite: Failed to link employee to auth user:", updateError);
      
      // Rollback: delete the auth user we just created
      console.log("employee-invite: Rolling back - deleting auth user:", authData.user.id);
      await adminClient.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json({
        error: `Failed to link employee account: ${updateError.message}`,
      }, { status: 500 });
    }

    console.log("employee-invite: Success - employee", employeeId, "linked to auth user", authData.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("employee-invite: Unexpected error:", err);
    return NextResponse.json({
      error: "Unexpected server error",
    }, { status: 500 });
  }
}
