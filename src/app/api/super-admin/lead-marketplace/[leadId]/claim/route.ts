import { type NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedMarketplaceTenant } from "@/lib/lead-marketplace/tenant-resolution";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

async function ensureAccess() {
  const access = await requireSuperAdminAccess();

  if (access.needsAuth) {
    return {
      deniedResponse: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      ),
      access,
    };
  }

  if (access.denied) {
    return {
      deniedResponse: NextResponse.json(
        { success: false, message: "Super Admin access required." },
        { status: 403 },
      ),
      access,
    };
  }

  if (access.rpcError) {
    return {
      deniedResponse: NextResponse.json(
        { success: false, message: "Unable to verify Super Admin access." },
        { status: 503 },
      ),
      access,
    };
  }

  return { deniedResponse: null, access };
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ leadId: string }> },
) {
  const { deniedResponse, access } = await ensureAccess();
  if (deniedResponse) {
    return deniedResponse;
  }

  const userId = access.user?.id;
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  const { leadId } = await context.params;
  const tenantResolution = await resolveAuthenticatedMarketplaceTenant(userId);
  if (!tenantResolution.ok) {
    return NextResponse.json(
      { success: false, message: tenantResolution.message },
      { status: tenantResolution.status },
    );
  }

  const supabase = await createServerSupabaseClient();
  const targetTenantId = tenantResolution.tenantId;

  const { data, error } = await supabase.rpc("claim_marketplace_lead", {
    target_lead_id: leadId,
    target_tenant_id: targetTenantId,
    claiming_user_id: userId,
    claiming_user_email: access.user?.email ?? null,
  });

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, claim: data });
}
