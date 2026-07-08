import "@/lib/globals-polyfill";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/admin-signup
 *
 * Creates a new admin account + tenant atomically using the service-role key
 * so that the caller never needs elevated privileges client-side.
 *
 * Body: { email, password, companyName }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password, companyName } = await req.json() as {
      email: string;
      password: string;
      companyName: string;
    };

    if (!email || !password || !companyName) {
      return NextResponse.json({ error: "email, password, and companyName are required." }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();

    // 1. Create auth user (auto-confirmed so they can log in immediately).
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "admin" },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "User creation returned no ID." }, { status: 500 });
    }

    // 2. Derive a URL-safe slug from the company name.
    const slug = companyName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 60) || `company-${Date.now()}`;

    // 3. Create tenant.
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({ company_name: companyName, owner_email: email, slug, plan: "starter", status: "active" })
      .select("id")
      .single();

    if (tenantError) {
      // Roll back: delete the auth user so there is no orphaned account.
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: `Tenant creation failed: ${tenantError.message}` }, { status: 400 });
    }

    // 4. Link auth user → tenant as admin.
    const { error: adminError } = await supabase
      .from("tenant_admins")
      .insert({ tenant_id: tenant.id, auth_user_id: userId, email });

    if (adminError) {
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: `Admin link failed: ${adminError.message}` }, { status: 400 });
    }

    // 5. Seed settings row for this tenant.
    await supabase.from("settings").insert({ tenant_id: tenant.id, company_name: companyName });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("admin-signup error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
