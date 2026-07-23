import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

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

function parseBoolean(value: string | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function parseNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export async function GET(request: NextRequest) {
  const denied = await ensureAccess();
  if (denied) {
    return denied;
  }

  const supabase = await createServerSupabaseClient();
  const searchParams = request.nextUrl.searchParams;

  const runId = searchParams.get("runId");
  const provider = searchParams.get("provider");
  const category = searchParams.get("category");
  const city = searchParams.get("city");
  const eligibilityStatus = searchParams.get("eligibilityStatus");
  const rejectionReason = searchParams.get("rejectionReason");
  const itemStatus = searchParams.get("itemStatus");
  const dismissed = parseBoolean(searchParams.get("dismissed"));
  const minScore = parseNumber(searchParams.get("minScore"));
  const maxScore = parseNumber(searchParams.get("maxScore"));
  const search = searchParams.get("search");
  const limit = Math.max(
    10,
    Math.min(Number(searchParams.get("limit") ?? 75) || 75, 200),
  );

  let query = supabase
    .from("lead_discovery_run_items")
    .select(
      "item_id,run_id,city,state,category,business_name,website,source_name,source_url,source_domain,provider,search_query,lead_eligibility_score,eligibility_status,rejection_reason,status,gate_stage,gate_rule,missing_evidence,conflicting_evidence,recommended_corrective_action,provider_reasoning,evidence_summary,location_match,facility_confirmed,official_source_confirmed,category_match,override_status,override_reason,overridden_by_user_id,overridden_at,dismissed,dismissed_reason,dismissed_by_user_id,dismissed_at,potential_lead_id,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (runId) query = query.eq("run_id", runId);
  if (provider) query = query.eq("provider", provider);
  if (category) query = query.eq("category", category);
  if (city) query = query.ilike("city", city.trim());
  if (eligibilityStatus)
    query = query.eq("eligibility_status", eligibilityStatus);
  if (rejectionReason) query = query.eq("rejection_reason", rejectionReason);
  if (itemStatus) query = query.eq("status", itemStatus);
  if (dismissed !== null) query = query.eq("dismissed", dismissed);
  if (typeof minScore === "number")
    query = query.gte("lead_eligibility_score", minScore);
  if (typeof maxScore === "number")
    query = query.lte("lead_eligibility_score", maxScore);
  if (search?.trim()) {
    const value = `%${search.trim()}%`;
    query = query.or(
      `business_name.ilike.${value},city.ilike.${value},state.ilike.${value},source_domain.ilike.${value},source_url.ilike.${value},search_query.ilike.${value}`,
    );
  }

  const [{ data: items, error: itemsError }, { data: runs, error: runsError }] =
    await Promise.all([
      query,
      supabase
        .from("lead_discovery_runs")
        .select(
          "run_id,started_at,status,businesses_found,processed_count,inserted_count,failed_count",
        )
        .order("started_at", { ascending: false })
        .limit(40),
    ]);

  if (itemsError || runsError) {
    return NextResponse.json(
      {
        success: false,
        message:
          itemsError?.message ??
          runsError?.message ??
          "Unable to load inspector items.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    items: items ?? [],
    runs: runs ?? [],
  });
}
