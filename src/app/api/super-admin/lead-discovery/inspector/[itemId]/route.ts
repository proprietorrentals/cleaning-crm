import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runDiscoveryLeadQualityGate } from "@/lib/lead-marketplace/discovery-lead-quality-gate";
import { createPotentialLeadFromResearch } from "@/lib/lead-marketplace/potential-lead-pipeline";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rerun_gate") }),
  z.object({ action: z.literal("needs_research") }),
  z.object({ action: z.literal("research_again") }),
  z.object({
    action: z.literal("approve_override"),
    confirm: z.boolean(),
    reason: z.string().trim().min(3).max(280),
  }),
  z.object({
    action: z.literal("dismiss"),
    reason: z.string().trim().min(3).max(280).optional(),
  }),
  z.object({ action: z.literal("restore") }),
]);

type RunItemRow = {
  item_id: string;
  run_id: string;
  city: string;
  state: string;
  zip_code: string | null;
  category: string;
  business_name: string;
  website: string | null;
  source_name: string | null;
  source_url: string | null;
  source_title: string | null;
  source_snippet: string | null;
  status: "queued" | "inserted" | "duplicate" | "failed";
  eligibility_status: "Eligible" | "Needs Research" | "Rejected" | null;
  rejection_reason: string | null;
  potential_lead_id: string | null;
  inspector_audit_log: unknown;
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

function appendAuditLog(existing: unknown, entry: Record<string, unknown>) {
  const now = new Date().toISOString();
  const nextEntry = { ...entry, at: now };

  if (Array.isArray(existing)) {
    return [...existing, nextEntry];
  }

  return [nextEntry];
}

function nextStatusAfterGate(
  current: RunItemRow["status"],
  eligibility: "Eligible" | "Needs Research" | "Rejected",
) {
  if (current === "inserted" || current === "duplicate") {
    return current;
  }

  if (eligibility === "Eligible") {
    return "queued" as const;
  }

  return "failed" as const;
}

async function loadItem(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  itemId: string,
) {
  const { data, error } = await supabase
    .from("lead_discovery_run_items")
    .select(
      "item_id,run_id,city,state,zip_code,category,business_name,website,source_name,source_url,source_title,source_snippet,status,eligibility_status,rejection_reason,potential_lead_id,inspector_audit_log",
    )
    .eq("item_id", itemId)
    .maybeSingle<RunItemRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Discovery run item not found.");
  }

  return data;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
  const denied = await ensureAccess();
  if (denied) {
    return denied;
  }

  const { itemId } = await context.params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("lead_discovery_run_items")
    .select(
      "item_id,run_id,area_id,city,state,zip_code,category,business_name,website,source_name,source_url,source_domain,source_title,source_snippet,provider,search_query,inspected_urls,pages_inspected,lead_eligibility_score,eligibility_status,rejection_reason,status,gate_stage,gate_rule,missing_evidence,conflicting_evidence,recommended_corrective_action,provider_reasoning,evidence_summary,location_match,facility_confirmed,official_source_confirmed,category_match,override_status,override_reason,overridden_by_user_id,overridden_at,dismissed,dismissed_reason,dismissed_by_user_id,dismissed_at,potential_lead_id,failure_reason,inspector_audit_log,created_at,updated_at",
    )
    .eq("item_id", itemId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { success: false, message: "Inspector item not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, item: data });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> },
) {
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

  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid inspector action payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { itemId } = await context.params;
  const supabase = await createServerSupabaseClient();

  let item: RunItemRow;
  try {
    item = await loadItem(supabase, itemId);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to load inspector item.",
      },
      { status: 404 },
    );
  }

  if (parsed.data.action === "dismiss") {
    const audit = appendAuditLog(item.inspector_audit_log, {
      byUserId: userId,
      action: "dismiss",
      reason: parsed.data.reason ?? null,
    });

    const { error } = await supabase
      .from("lead_discovery_run_items")
      .update({
        dismissed: true,
        dismissed_reason: parsed.data.reason ?? null,
        dismissed_by_user_id: userId,
        dismissed_at: new Date().toISOString(),
        inspector_audit_log: audit,
      })
      .eq("item_id", item.item_id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "restore") {
    const audit = appendAuditLog(item.inspector_audit_log, {
      byUserId: userId,
      action: "restore",
    });

    const { error } = await supabase
      .from("lead_discovery_run_items")
      .update({
        dismissed: false,
        dismissed_reason: null,
        dismissed_by_user_id: null,
        dismissed_at: null,
        inspector_audit_log: audit,
      })
      .eq("item_id", item.item_id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "needs_research") {
    const audit = appendAuditLog(item.inspector_audit_log, {
      byUserId: userId,
      action: "needs_research",
    });

    const { error } = await supabase
      .from("lead_discovery_run_items")
      .update({
        eligibility_status: "Needs Research",
        rejection_reason: null,
        status:
          item.status === "inserted" || item.status === "duplicate"
            ? item.status
            : "failed",
        gate_stage: "post_enrichment",
        gate_rule: "manual_needs_research",
        recommended_corrective_action:
          "research again using current provider pipeline",
        inspector_audit_log: audit,
      })
      .eq("item_id", item.item_id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "rerun_gate") {
    const gate = await runDiscoveryLeadQualityGate({
      businessName: item.business_name,
      website: item.website,
      sourceName: item.source_name ?? "Unknown",
      sourceUrl: item.source_url,
      sourceTitle: item.source_title,
      sourceSnippet: item.source_snippet,
      category: item.category as
        | "Office"
        | "Medical"
        | "Industrial"
        | "Manufacturing"
        | "Warehouse"
        | "Apartment"
        | "School"
        | "Church"
        | "Retail"
        | "Hotel"
        | "Government"
        | "Nonprofit",
      city: item.city,
      state: item.state,
      zipCode: item.zip_code,
    });

    const audit = appendAuditLog(item.inspector_audit_log, {
      byUserId: userId,
      action: "rerun_gate",
      outcome: gate.eligibilityStatus,
    });

    const nextStatus = nextStatusAfterGate(item.status, gate.eligibilityStatus);

    const { error } = await supabase
      .from("lead_discovery_run_items")
      .update({
        business_name: gate.normalizedBusinessName || item.business_name,
        website: gate.website,
        lead_eligibility_score: gate.leadEligibilityScore,
        eligibility_status: gate.eligibilityStatus,
        rejection_reason: gate.rejectionReason,
        gate_stage: gate.gateStage,
        gate_rule: gate.gateRule,
        missing_evidence: gate.missingEvidence,
        conflicting_evidence: gate.conflictingEvidence,
        recommended_corrective_action: gate.recommendedCorrectiveAction,
        provider_reasoning: gate.providerReasoning,
        evidence_summary: gate.evidenceSummary,
        location_match: gate.locationMatch,
        facility_confirmed: gate.facilityConfirmed,
        official_source_confirmed: gate.officialSourceConfirmed,
        category_match: gate.categoryMatch,
        status: nextStatus,
        inspector_audit_log: audit,
      })
      .eq("item_id", item.item_id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "research_again") {
    try {
      const created = await createPotentialLeadFromResearch({
        supabase,
        input: {
          businessName: item.business_name,
          city: item.city,
          state: item.state,
          website: item.website,
        },
        discovery: {
          discoveredVia: "discovery",
          discoveryRunId: item.run_id,
          discoveryCategory: item.category,
        },
      });

      const audit = appendAuditLog(item.inspector_audit_log, {
        byUserId: userId,
        action: "research_again",
        duplicate: created.duplicate,
        leadId: created.lead.potential_lead_id,
      });

      const { error } = await supabase
        .from("lead_discovery_run_items")
        .update({
          status: created.duplicate ? "duplicate" : "inserted",
          potential_lead_id: created.lead.potential_lead_id,
          eligibility_status: created.duplicate ? "Rejected" : "Eligible",
          rejection_reason: created.duplicate ? "duplicate" : null,
          gate_stage: "post_enrichment",
          gate_rule: created.duplicate ? "duplicate" : "manual_research_again",
          inspector_audit_log: audit,
        })
        .eq("item_id", item.item_id);

      if (error) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Unable to run additional research for this candidate.",
        },
        { status: 500 },
      );
    }
  }

  if (!parsed.data.confirm) {
    return NextResponse.json(
      {
        success: false,
        message: "Manual approval requires explicit confirmation.",
      },
      { status: 400 },
    );
  }

  try {
    const created = await createPotentialLeadFromResearch({
      supabase,
      input: {
        businessName: item.business_name,
        city: item.city,
        state: item.state,
        website: item.website,
      },
      discovery: {
        discoveredVia: "discovery",
        discoveryRunId: item.run_id,
        discoveryCategory: item.category,
      },
    });

    const audit = appendAuditLog(item.inspector_audit_log, {
      byUserId: userId,
      action: "approve_override",
      reason: parsed.data.reason,
      duplicate: created.duplicate,
      leadId: created.lead.potential_lead_id,
    });

    const { error } = await supabase
      .from("lead_discovery_run_items")
      .update({
        status: created.duplicate ? "duplicate" : "inserted",
        potential_lead_id: created.lead.potential_lead_id,
        eligibility_status: "Eligible",
        rejection_reason: null,
        gate_stage: "post_enrichment",
        gate_rule: "manual_override",
        override_status: true,
        override_reason: parsed.data.reason,
        overridden_by_user_id: userId,
        overridden_at: new Date().toISOString(),
        dismissed: false,
        dismissed_reason: null,
        dismissed_by_user_id: null,
        dismissed_at: null,
        inspector_audit_log: audit,
      })
      .eq("item_id", item.item_id);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to approve candidate override.",
      },
      { status: 500 },
    );
  }
}
