import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  DISCOVERY_CATEGORIES,
  runLeadDiscovery,
  type DiscoveryArea,
  type DiscoveryCategory,
} from "@/lib/lead-marketplace/discovery-engine";
import { POTENTIAL_LEAD_SELECT } from "@/lib/lead-marketplace/potential-lead-pipeline";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const areaSchema = z.object({
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(50),
  zipCode: z.string().trim().max(20).optional(),
  radiusMiles: z.coerce.number().int().min(1).max(100).default(20),
});

const runSchema = z.object({
  areaIds: z.array(z.string().uuid()).min(1),
  categories: z
    .array(z.enum(DISCOVERY_CATEGORIES))
    .min(1)
    .max(DISCOVERY_CATEGORIES.length),
  dailyLimit: z.coerce.number().int().min(1).max(500),
});

const controlSchema = z.object({
  runId: z.string().uuid(),
  command: z.enum(["pause", "resume", "stop"]),
});

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add_area"), payload: areaSchema }),
  z.object({ action: z.literal("run_discovery"), payload: runSchema }),
  z.object({ action: z.literal("control_run"), payload: controlSchema }),
]);

type LeadDiscoveryAreaRow = {
  area_id: string;
  city: string;
  state: string;
  zip_code: string | null;
  radius_miles: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type LeadDiscoveryRunRow = {
  run_id: string;
  status: "running" | "paused" | "stopped" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  daily_limit: number;
  selected_categories: string[];
  selected_area_ids: string[];
  businesses_found: number;
  inserted_count: number;
  duplicates_skipped: number;
  failed_count: number;
  average_confidence: number;
  error_message: string | null;
  created_at: string;
};

type QueueLeadRow = {
  potential_lead_id: string;
  business_name: string;
  city: string;
  state: string;
  status: "New" | "AI Reviewed" | "Needs Review" | "Verified" | "Rejected";
  ai_confidence: number;
  needs_manual_verification: boolean | null;
  organization_type: string | null;
  outsourcing_likelihood: string | null;
  procurement_notes: string | null;
  recommended_next_step: string | null;
  discovered_at: string | null;
};

async function ensureAccess() {
  const access = await requireSuperAdminAccess();

  if (access.needsAuth) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  if (access.denied) {
    return NextResponse.json(
      { success: false, message: "Super Admin access required." },
      { status: 403 },
    );
  }

  if (access.rpcError) {
    return NextResponse.json(
      { success: false, message: "Unable to verify Super Admin access." },
      { status: 503 },
    );
  }

  return null;
}

function startOfTodayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export async function GET() {
  const denied = await ensureAccess();
  if (denied) {
    return denied;
  }

  const supabase = await createServerSupabaseClient();
  const todayIso = startOfTodayIso();

  const [areasResult, runsResult, queueResult, discoveredTodayResult] =
    await Promise.all([
      supabase
        .from("lead_discovery_areas")
        .select(
          "area_id,city,state,zip_code,radius_miles,is_active,created_at,updated_at",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("lead_discovery_runs")
        .select(
          "run_id,status,started_at,completed_at,duration_seconds,daily_limit,selected_categories,selected_area_ids,businesses_found,inserted_count,duplicates_skipped,failed_count,average_confidence,error_message,created_at",
        )
        .order("started_at", { ascending: false })
        .limit(40),
      supabase
        .from("potential_marketplace_leads")
        .select(
          "potential_lead_id,business_name,city,state,status,ai_confidence,needs_manual_verification,organization_type,outsourcing_likelihood,procurement_notes,recommended_next_step,discovered_at",
        )
        .eq("discovered_via", "discovery")
        .order("discovered_at", { ascending: false })
        .limit(80),
      supabase
        .from("potential_marketplace_leads")
        .select(
          "potential_lead_id,city,organization_type,status,ai_confidence,needs_manual_verification,discovered_at",
        )
        .eq("discovered_via", "discovery")
        .gte("discovered_at", todayIso)
        .order("discovered_at", { ascending: false }),
    ]);

  const errors = [
    areasResult.error,
    runsResult.error,
    queueResult.error,
    discoveredTodayResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: errors.map((error) => error?.message).join(" | "),
      },
      { status: 500 },
    );
  }

  const areas = (areasResult.data ?? []) as LeadDiscoveryAreaRow[];
  const runs = (runsResult.data ?? []) as LeadDiscoveryRunRow[];
  const queue = (queueResult.data ?? []) as QueueLeadRow[];
  const discoveredToday = (discoveredTodayResult.data ?? []) as Array<{
    potential_lead_id: string;
    city: string;
    organization_type: string | null;
    status: "New" | "AI Reviewed" | "Needs Review" | "Verified" | "Rejected";
    ai_confidence: number;
    needs_manual_verification: boolean | null;
    discovered_at: string | null;
  }>;

  const businessesDiscoveredToday = discoveredToday.length;
  const aiReviewedToday = discoveredToday.filter(
    (lead) => lead.status === "AI Reviewed",
  ).length;
  const highConfidenceToday = discoveredToday.filter(
    (lead) => lead.ai_confidence >= 75,
  ).length;
  const needsManualVerificationToday = discoveredToday.filter(
    (lead) => lead.needs_manual_verification,
  ).length;

  const duplicateBusinessesSkipped = runs
    .filter((run) => run.started_at >= todayIso)
    .reduce((total, run) => total + (run.duplicates_skipped || 0), 0);

  const todaysRuns = runs.filter((run) => run.started_at >= todayIso);
  const foundTotal = todaysRuns.reduce(
    (total, run) => total + (run.businesses_found || 0),
    0,
  );
  const insertedTotal = todaysRuns.reduce(
    (total, run) => total + (run.inserted_count || 0),
    0,
  );

  const discoverySuccessRate =
    foundTotal > 0 ? Math.round((insertedTotal / foundTotal) * 100) : 0;

  const averageConfidence =
    businessesDiscoveredToday > 0
      ? Math.round(
          discoveredToday.reduce((total, lead) => total + lead.ai_confidence, 0) /
            businessesDiscoveredToday,
        )
      : 0;

  const cityCounts = new Map<string, number>();
  const orgTypeCounts = new Map<string, number>();

  for (const lead of discoveredToday) {
    cityCounts.set(lead.city, (cityCounts.get(lead.city) ?? 0) + 1);
    const orgType = lead.organization_type ?? "unknown";
    orgTypeCounts.set(orgType, (orgTypeCounts.get(orgType) ?? 0) + 1);
  }

  const topCities = [...cityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([city, count]) => ({ city, count }));

  const topOrganizationTypes = [...orgTypeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([organizationType, count]) => ({ organizationType, count }));

  return NextResponse.json({
    success: true,
    areas,
    runs,
    queue,
    metrics: {
      businessesDiscoveredToday,
      aiReviewedToday,
      highConfidenceToday,
      needsManualVerificationToday,
      duplicateBusinessesSkipped,
      discoverySuccessRate,
      averageConfidence,
      topCities,
      topOrganizationTypes,
    },
  });
}

export async function POST(request: NextRequest) {
  const denied = await ensureAccess();
  if (denied) {
    return denied;
  }

  const access = await requireSuperAdminAccess();
  const userId = access.user?.id;
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid lead discovery request.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();

  if (parsed.data.action === "add_area") {
    const area = parsed.data.payload;

    const { data, error } = await supabase
      .from("lead_discovery_areas")
      .insert({
        city: area.city.trim(),
        state: area.state.trim().toUpperCase(),
        zip_code: area.zipCode?.trim() || null,
        radius_miles: area.radiusMiles,
        created_by_user_id: userId,
      })
      .select("area_id,city,state,zip_code,radius_miles,is_active,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, area: data });
  }

  if (parsed.data.action === "control_run") {
    const nextStatus =
      parsed.data.payload.command === "pause"
        ? "paused"
        : parsed.data.payload.command === "resume"
          ? "running"
          : "stopped";

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
    };

    if (nextStatus === "stopped") {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("lead_discovery_runs")
      .update(updatePayload)
      .eq("run_id", parsed.data.payload.runId)
      .select("run_id,status")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      run: data,
      message: `Run ${parsed.data.payload.command} command accepted.`,
    });
  }

  const runRequest = parsed.data.payload;

  const { data: areas, error: areasError } = await supabase
    .from("lead_discovery_areas")
    .select("area_id,city,state,zip_code,radius_miles")
    .in("area_id", runRequest.areaIds)
    .eq("is_active", true);

  if (areasError) {
    return NextResponse.json(
      { success: false, message: areasError.message },
      { status: 500 },
    );
  }

  const selectedAreas = (areas ?? []) as DiscoveryArea[];

  if (selectedAreas.length === 0) {
    return NextResponse.json(
      { success: false, message: "No active discovery areas selected." },
      { status: 400 },
    );
  }

  try {
    const summary = await runLeadDiscovery({
      supabase,
      requestedByUserId: userId,
      areas: selectedAreas,
      categories: runRequest.categories as DiscoveryCategory[],
      dailyLimit: runRequest.dailyLimit,
    });

    const { data: insertedLeads } = await supabase
      .from("potential_marketplace_leads")
      .select(POTENTIAL_LEAD_SELECT)
      .in("potential_lead_id", summary.insertedLeadIds)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      success: true,
      run: summary,
      insertedLeads: insertedLeads ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Lead discovery pipeline failed.",
      },
      { status: 500 },
    );
  }
}
