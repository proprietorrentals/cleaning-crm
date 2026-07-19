import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const claimBodySchema = z.object({
  tenantId: z.string().uuid().optional(),
});

const DEFAULT_TARGET_TENANT_ID =
  process.env.PUBLIC_MARKETING_TENANT_ID ||
  "00000000-0000-0000-0000-000000000001";

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
  request: NextRequest,
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
  const body = await request.json().catch(() => null);
  const parsed = claimBodySchema.safeParse(body ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const targetTenantId = parsed.data.tenantId ?? DEFAULT_TARGET_TENANT_ID;

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
