import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createPotentialLeadFromResearch } from "@/lib/lead-marketplace/potential-lead-pipeline";
import { discoverCandidatesWithProviders } from "@/lib/lead-marketplace/research-providers";

export const DISCOVERY_CATEGORIES = [
  "Office",
  "Medical",
  "Industrial",
  "Manufacturing",
  "Warehouse",
  "Apartment",
  "School",
  "Church",
  "Retail",
  "Hotel",
  "Government",
  "Nonprofit",
] as const;

export type DiscoveryCategory = (typeof DISCOVERY_CATEGORIES)[number];

export type DiscoveryArea = {
  area_id: string;
  city: string;
  state: string;
  zip_code: string | null;
  radius_miles: number;
};

export type DiscoveryCandidate = {
  businessName: string;
  website: string | null;
  sourceName: string;
  sourceUrl: string | null;
  city: string;
  state: string;
  category: DiscoveryCategory;
};

export type DiscoveryRunSummary = {
  runId: string;
  status: "completed" | "paused" | "stopped" | "failed";
  businessesFound: number;
  inserted: number;
  duplicatesSkipped: number;
  failures: number;
  averageConfidence: number;
  durationSeconds: number;
  insertedLeadIds: string[];
};

function dedupeCandidates(candidates: DiscoveryCandidate[]) {
  const seen = new Set<string>();
  const deduped: DiscoveryCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.businessName.toLowerCase()}|${candidate.city.toLowerCase()}|${candidate.state.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

async function fetchRunStatus(
  supabase: SupabaseClient,
  runId: string,
): Promise<"running" | "paused" | "stopped" | "completed" | "failed"> {
  const { data, error } = await supabase
    .from("lead_discovery_runs")
    .select("status")
    .eq("run_id", runId)
    .single<{
      status: "running" | "paused" | "stopped" | "completed" | "failed";
    }>();

  if (error || !data) {
    return "failed";
  }

  return data.status;
}

export async function discoverPublicBusinesses(params: {
  area: DiscoveryArea;
  category: DiscoveryCategory;
  limit: number;
}): Promise<DiscoveryCandidate[]> {
  const candidates = await discoverCandidatesWithProviders({
    city: params.area.city,
    state: params.area.state,
    zipCode: params.area.zip_code,
    category: params.category,
    limit: params.limit,
  });

  const typedCandidates: DiscoveryCandidate[] = candidates.map((candidate) => ({
    ...candidate,
    category: params.category,
  }));

  return dedupeCandidates(typedCandidates).slice(0, params.limit);
}

export async function runLeadDiscovery(params: {
  supabase: SupabaseClient;
  requestedByUserId: string;
  areas: DiscoveryArea[];
  categories: DiscoveryCategory[];
  dailyLimit: number;
}): Promise<DiscoveryRunSummary> {
  const startedAt = new Date();
  const safeLimit = Math.max(1, Math.min(params.dailyLimit, 500));

  const { data: runRow, error: runCreateError } = await params.supabase
    .from("lead_discovery_runs")
    .insert({
      status: "running",
      requested_by_user_id: params.requestedByUserId,
      daily_limit: safeLimit,
      selected_categories: params.categories,
      selected_area_ids: params.areas.map((area) => area.area_id),
      started_at: startedAt.toISOString(),
    })
    .select("run_id")
    .single<{ run_id: string }>();

  if (runCreateError || !runRow) {
    throw new Error(
      runCreateError?.message ?? "Unable to create discovery run.",
    );
  }

  const runId = runRow.run_id;

  let businessesFound = 0;
  let inserted = 0;
  let duplicatesSkipped = 0;
  let failures = 0;
  let confidenceTotal = 0;
  let confidenceCount = 0;
  const insertedLeadIds: string[] = [];

  try {
    outer: for (const area of params.areas) {
      for (const category of params.categories) {
        if (inserted >= safeLimit) {
          break outer;
        }

        const status = await fetchRunStatus(params.supabase, runId);
        if (status === "stopped") {
          break outer;
        }
        if (status === "paused") {
          await params.supabase
            .from("lead_discovery_runs")
            .update({
              status: "paused",
            })
            .eq("run_id", runId);

          return {
            runId,
            status: "paused",
            businessesFound,
            inserted,
            duplicatesSkipped,
            failures,
            averageConfidence:
              confidenceCount > 0
                ? Number((confidenceTotal / confidenceCount).toFixed(2))
                : 0,
            durationSeconds: Math.max(
              0,
              Math.round((Date.now() - startedAt.getTime()) / 1000),
            ),
            insertedLeadIds,
          };
        }

        const candidates = await discoverPublicBusinesses({
          area,
          category,
          limit: Math.min(30, safeLimit - inserted),
        });

        businessesFound += candidates.length;

        for (const candidate of candidates) {
          if (inserted >= safeLimit) {
            break outer;
          }

          const { data: itemRow } = await params.supabase
            .from("lead_discovery_run_items")
            .insert({
              run_id: runId,
              area_id: area.area_id,
              city: area.city,
              state: area.state,
              zip_code: area.zip_code,
              category,
              business_name: candidate.businessName,
              website: candidate.website,
              source_name: candidate.sourceName,
              source_url: candidate.sourceUrl,
              status: "queued",
            })
            .select("item_id")
            .single<{ item_id: string }>();

          try {
            const created = await createPotentialLeadFromResearch({
              supabase: params.supabase,
              input: {
                businessName: candidate.businessName,
                city: candidate.city,
                state: candidate.state,
                website: candidate.website,
              },
              discovery: {
                discoveredVia: "discovery",
                discoveryRunId: runId,
                discoveryCategory: category,
              },
            });

            if (created.duplicate) {
              duplicatesSkipped += 1;
              if (itemRow?.item_id) {
                await params.supabase
                  .from("lead_discovery_run_items")
                  .update({
                    status: "duplicate",
                    potential_lead_id: created.lead.potential_lead_id,
                  })
                  .eq("item_id", itemRow.item_id);
              }
            } else {
              inserted += 1;
              insertedLeadIds.push(created.lead.potential_lead_id);
              confidenceTotal += created.lead.ai_confidence;
              confidenceCount += 1;

              if (itemRow?.item_id) {
                await params.supabase
                  .from("lead_discovery_run_items")
                  .update({
                    status: "inserted",
                    potential_lead_id: created.lead.potential_lead_id,
                  })
                  .eq("item_id", itemRow.item_id);
              }
            }
          } catch (error) {
            failures += 1;

            if (itemRow?.item_id) {
              await params.supabase
                .from("lead_discovery_run_items")
                .update({
                  status: "failed",
                  failure_reason:
                    error instanceof Error ? error.message : "Unknown failure",
                })
                .eq("item_id", itemRow.item_id);
            }
          }
        }
      }
    }

    const completedAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
    );
    const averageConfidence =
      confidenceCount > 0
        ? Number((confidenceTotal / confidenceCount).toFixed(2))
        : 0;

    await params.supabase
      .from("lead_discovery_runs")
      .update({
        status: "completed",
        completed_at: completedAt.toISOString(),
        duration_seconds: durationSeconds,
        businesses_found: businessesFound,
        inserted_count: inserted,
        duplicates_skipped: duplicatesSkipped,
        failed_count: failures,
        average_confidence: averageConfidence,
      })
      .eq("run_id", runId);

    return {
      runId,
      status: "completed",
      businessesFound,
      inserted,
      duplicatesSkipped,
      failures,
      averageConfidence,
      durationSeconds,
      insertedLeadIds,
    };
  } catch (error) {
    const completedAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
    );

    await params.supabase
      .from("lead_discovery_runs")
      .update({
        status: "failed",
        completed_at: completedAt.toISOString(),
        duration_seconds: durationSeconds,
        businesses_found: businessesFound,
        inserted_count: inserted,
        duplicates_skipped: duplicatesSkipped,
        failed_count: failures,
        average_confidence:
          confidenceCount > 0
            ? Number((confidenceTotal / confidenceCount).toFixed(2))
            : 0,
        error_message:
          error instanceof Error ? error.message : "Discovery pipeline failed.",
      })
      .eq("run_id", runId);

    throw error;
  }
}
