import "@/lib/globals-polyfill";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/employee-invite
 *
 * Creates a Supabase auth user for an existing employee record and links them.
 * Called by the admin when they want to give portal access to an employee
 * who does not yet have an auth account.
 *
 * Body: { employeeId, email, tempPassword }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify the calling user is a tenant admin.
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user }, error: sessionError } = await serverSupabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: adminRecord } = await serverSupabase
      .from("tenant_admins")
      .select("tenant_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!adminRecord) {
      return NextResponse.json({ error: "Forbidden: must be a tenant admin." }, { status: 403 });
    }

    const { employeeId, email, tempPassword } = await req.json() as {
      employeeId: string;
      email: string;
      tempPassword: string;
    };

    if (!employeeId || !email || !tempPassword) {
      return NextResponse.json({ error: "employeeId, email, and tempPassword are required." }, { status: 400 });
    }

    if (tempPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();

    // Confirm the employee belongs to the admin's tenant.
    const { data: employee } = await supabase
      .from("employees")
      .select("id, auth_user_id, tenant_id")
      .eq("id", employeeId)
      .eq("tenant_id", adminRecord.tenant_id)
      .maybeSingle();

    if (!employee) {
      return NextResponse.json({ error: "Employee not found in your tenant." }, { status: 404 });
    }

    if (employee.auth_user_id) {
      return NextResponse.json({ error: "Employee already has a portal account." }, { status: 409 });
    }

    // Create auth user (auto-confirmed so they can log in immediately).
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: "employee" },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Link auth user → employee record.
    const { error: updateError } = await supabase
      .from("employees")
      .update({ auth_user_id: authData.user!.id, is_active: true, status: "Active" })
      .eq("id", employeeId);

    if (updateError) {
      await supabase.auth.admin.deleteUser(authData.user!.id);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("employee-invite error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
