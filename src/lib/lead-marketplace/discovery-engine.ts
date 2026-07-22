import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createPotentialLeadFromResearch,
  type PotentialLeadRow,
} from "@/lib/lead-marketplace/potential-lead-pipeline";

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

type TavilySearchResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
  }>;
};

type FirecrawlScrapeResponse = {
  success?: boolean;
  data?: {
    metadata?: {
      title?: string;
      siteName?: string;
    };
  };
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

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeBusinessNameFromTitle(title: string) {
  return normalizeWhitespace(title)
    .replace(/\|.*$/, "")
    .replace(/\-\s*(Home|Official Site|Contact|Locations).*$/i, "")
    .trim();
}

async function discoverWithTavily(params: {
  area: DiscoveryArea;
  category: DiscoveryCategory;
  limit: number;
}): Promise<DiscoveryCandidate[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return [];
  }

  const query = [
    `${params.category} businesses`,
    params.area.city,
    params.area.state,
    params.area.zip_code ?? "",
    "commercial property facilities",
  ]
    .filter(Boolean)
    .join(" ");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: Math.min(20, params.limit * 2),
      search_depth: "basic",
      include_answer: false,
      include_images: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily discovery failed with status ${response.status}`);
  }

  const payload = (await response.json()) as TavilySearchResponse;

  const candidates: DiscoveryCandidate[] = [];
  for (const result of payload.results ?? []) {
    const rawTitle = result.title ? normalizeWhitespace(result.title) : "";
    const businessName = rawTitle
      ? normalizeBusinessNameFromTitle(rawTitle)
      : "";

    if (!businessName || businessName.length < 2) {
      continue;
    }

    candidates.push({
      businessName,
      website: result.url ?? null,
      sourceName: "Tavily",
      sourceUrl: result.url ?? null,
      city: params.area.city,
      state: params.area.state,
      category: params.category,
    });
  }

  return candidates;
}

async function enrichWithFirecrawl(candidates: DiscoveryCandidate[]) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return candidates;
  }

  const limited = candidates.slice(0, 6);
  const enriched = await Promise.all(
    limited.map(async (candidate) => {
      if (!candidate.website) {
        return candidate;
      }

      try {
        const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            url: candidate.website,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });

        if (!response.ok) {
          return candidate;
        }

        const payload = (await response.json()) as FirecrawlScrapeResponse;
        const title =
          payload.data?.metadata?.siteName ?? payload.data?.metadata?.title;

        if (!title) {
          return candidate;
        }

        return {
          ...candidate,
          businessName: normalizeBusinessNameFromTitle(title),
          sourceName: "Firecrawl",
        };
      } catch {
        return candidate;
      }
    }),
  );

  return [...enriched, ...candidates.slice(6)];
}

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
    .single<{ status: "running" | "paused" | "stopped" | "completed" | "failed" }>();

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
  const tavilyCandidates = await discoverWithTavily(params);
  const firecrawlEnriched = await enrichWithFirecrawl(tavilyCandidates);
  return dedupeCandidates(firecrawlEnriched).slice(0, params.limit);
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
    throw new Error(runCreateError?.message ?? "Unable to create discovery run.");
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
