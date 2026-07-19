import { type NextRequest, NextResponse } from "next/server";
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

type ClaimTimelineRow = {
  lead_id: string;
  changed_at: string;
  change_summary: string | null;
  metadata: Record<string, unknown> | null;
  lead: Array<{
    lead_id: string;
    business_name: string;
    city: string;
    state: string;
    lead_grade: string;
    quality_score: number;
    estimated_annual_value: number;
    qualification_status: string;
    claimed_at: string | null;
  }> | null;
};

export async function GET(_request: NextRequest) {
  const { deniedResponse } = await ensureAccess();
  if (deniedResponse) {
    return deniedResponse;
  }

  const supabase = await createServerSupabaseClient();
  const thirtyDaysAgoIso = new Date(
    Date.now() - 29 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    recentClaimsResult,
    claimTasksResult,
    funnelResult,
    recentTimelineResult,
  ] = await Promise.all([
    supabase
      .from("marketplace_leads")
      .select(
        "lead_id,estimated_annual_value,claimed_at,status,qualification_status",
      )
      .not("claimed_at", "is", null)
      .gte("claimed_at", thirtyDaysAgoIso),
    supabase
      .from("ai_assignments")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgoIso)
      .ilike("title", "Lead Claim:%"),
    supabase
      .from("marketplace_leads")
      .select("status,qualification_status,estimated_annual_value,claimed_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("marketplace_lead_audit_history")
      .select(
        "lead_id,changed_at,change_summary,metadata,lead:marketplace_leads(lead_id,business_name,city,state,lead_grade,quality_score,estimated_annual_value,qualification_status,claimed_at)",
      )
      .eq("action", "claimed")
      .order("changed_at", { ascending: false })
      .limit(24),
  ]);

  if (
    recentClaimsResult.error ||
    claimTasksResult.error ||
    funnelResult.error ||
    recentTimelineResult.error
  ) {
    return NextResponse.json(
      { success: false, message: "Unable to load claim insights." },
      { status: 500 },
    );
  }

  const recentClaims = (recentClaimsResult.data ?? []) as Array<{
    lead_id: string;
    estimated_annual_value: number;
    claimed_at: string | null;
    status: string;
    qualification_status: string;
  }>;

  const funnelRows = (funnelResult.data ?? []) as Array<{
    status: string;
    qualification_status: string;
    estimated_annual_value: number;
    claimed_at: string | null;
  }>;

  const timelineRows = (recentTimelineResult.data ?? []) as ClaimTimelineRow[];

  const claimedValue = recentClaims.reduce(
    (total, row) => total + (Number(row.estimated_annual_value) || 0),
    0,
  );
  const taskCount = claimTasksResult.count ?? 0;
  const claimCount = recentClaims.length;
  const claimSuccessRate =
    claimCount > 0
      ? Math.min(100, Math.round((taskCount / (claimCount * 6)) * 100))
      : 0;

  const funnel = {
    verified: funnelRows.filter(
      (row) => row.qualification_status === "Verified",
    ).length,
    claimed: funnelRows.filter((row) => row.status === "Claimed").length,
    open: funnelRows.filter(
      (row) =>
        row.status !== "Claimed" &&
        row.status !== "closed_won" &&
        row.status !== "closed_lost",
    ).length,
    won: funnelRows.filter((row) => row.status === "closed_won").length,
    lost: funnelRows.filter((row) => row.status === "closed_lost").length,
  };

  return NextResponse.json({
    success: true,
    metrics: {
      recentClaimCount: claimCount,
      revenuePotential: claimedValue,
      aiTasksGenerated: taskCount,
      claimSuccessRate,
      funnel,
    },
    timeline: timelineRows.map((row) => ({
      leadId: row.lead_id,
      businessName: row.lead?.[0]?.business_name ?? "Unknown lead",
      city: row.lead?.[0]?.city ?? "",
      state: row.lead?.[0]?.state ?? "",
      leadGrade: row.lead?.[0]?.lead_grade ?? "D",
      qualityScore: row.lead?.[0]?.quality_score ?? 0,
      estimatedAnnualValue: row.lead?.[0]?.estimated_annual_value ?? 0,
      qualificationStatus: row.lead?.[0]?.qualification_status ?? "New",
      claimedAt: row.lead?.[0]?.claimed_at ?? row.changed_at,
      changedAt: row.changed_at,
      changeSummary: row.change_summary,
      metadata: row.metadata ?? {},
    })),
  });
}
