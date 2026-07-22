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
export type DiscoveryRunStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed";

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

type DiscoveryRunRow = {
  run_id: string;
  status: DiscoveryRunStatus;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  requested_by_user_id: string | null;
  daily_limit: number;
  selected_categories: string[];
  selected_area_ids: string[];
  businesses_found: number;
  processed_count: number;
  inserted_count: number;
  duplicates_skipped: number;
  failed_count: number;
  average_confidence: number;
  percent_complete: number;
  stop_requested: boolean;
  next_area_index: number;
  next_category_index: number;
  confidence_total: number;
  confidence_count: number;
  error_message: string | null;
};

type QueuedRunItem = {
  item_id: string;
  area_id: string | null;
  city: string;
  state: string;
  category: string;
  business_name: string;
  website: string | null;
};

export type DiscoveryRunSnapshot = {
  runId: string;
  status: DiscoveryRunStatus;
  totalDiscovered: number;
  processed: number;
  inserted: number;
  duplicates: number;
  failures: number;
  percentComplete: number;
  durationSeconds: number;
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

function elapsedSeconds(startedAtIso: string) {
  return Math.max(
    0,
    Math.round((Date.now() - new Date(startedAtIso).getTime()) / 1000),
  );
}

function progressPercent(
  processed: number,
  limit: number,
  status: DiscoveryRunStatus,
) {
  if (status === "completed") {
    return 100;
  }

  if (limit <= 0) {
    return 0;
  }

  const raw = Math.round((processed / limit) * 100);
  return Math.max(0, Math.min(99, raw));
}

async function loadRun(supabase: SupabaseClient, runId: string) {
  const { data, error } = await supabase
    .from("lead_discovery_runs")
    .select(
      "run_id,status,started_at,completed_at,duration_seconds,requested_by_user_id,daily_limit,selected_categories,selected_area_ids,businesses_found,processed_count,inserted_count,duplicates_skipped,failed_count,average_confidence,percent_complete,stop_requested,next_area_index,next_category_index,confidence_total,confidence_count,error_message",
    )
    .eq("run_id", runId)
    .single<DiscoveryRunRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Discovery run not found.");
  }

  return data;
}

async function persistRunProgress(
  supabase: SupabaseClient,
  run: DiscoveryRunRow,
  updates: Partial<DiscoveryRunRow>,
) {
  const nextStatus = updates.status ?? run.status;
  const nextProcessed = updates.processed_count ?? run.processed_count;
  const nextLimit = updates.daily_limit ?? run.daily_limit;

  const percentComplete =
    updates.percent_complete ??
    progressPercent(nextProcessed, nextLimit, nextStatus);

  const updatePayload: Partial<DiscoveryRunRow> = {
    ...updates,
    percent_complete: percentComplete,
    duration_seconds:
      updates.duration_seconds ??
      (nextStatus === "completed" || nextStatus === "failed"
        ? elapsedSeconds(run.started_at)
        : run.duration_seconds),
  };

  if (nextStatus === "completed" || nextStatus === "failed") {
    updatePayload.completed_at =
      updates.completed_at ?? new Date().toISOString();
  }

  const { error } = await supabase
    .from("lead_discovery_runs")
    .update(updatePayload)
    .eq("run_id", run.run_id);

  if (error) {
    throw new Error(error.message);
  }
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

export async function createLeadDiscoveryRun(params: {
  supabase: SupabaseClient;
  requestedByUserId: string;
  areaIds: string[];
  categories: DiscoveryCategory[];
  dailyLimit: number;
}): Promise<DiscoveryRunSnapshot> {
  const safeLimit = Math.max(1, Math.min(params.dailyLimit, 500));
  const startedAt = new Date().toISOString();

  const { data, error } = await params.supabase
    .from("lead_discovery_runs")
    .insert({
      status: "pending",
      requested_by_user_id: params.requestedByUserId,
      daily_limit: safeLimit,
      selected_categories: params.categories,
      selected_area_ids: params.areaIds,
      businesses_found: 0,
      processed_count: 0,
      inserted_count: 0,
      duplicates_skipped: 0,
      failed_count: 0,
      average_confidence: 0,
      percent_complete: 0,
      stop_requested: false,
      next_area_index: 0,
      next_category_index: 0,
      confidence_total: 0,
      confidence_count: 0,
      started_at: startedAt,
    })
    .select(
      "run_id,status,businesses_found,processed_count,inserted_count,duplicates_skipped,failed_count,percent_complete,started_at",
    )
    .single<{
      run_id: string;
      status: DiscoveryRunStatus;
      businesses_found: number;
      processed_count: number;
      inserted_count: number;
      duplicates_skipped: number;
      failed_count: number;
      percent_complete: number;
      started_at: string;
    }>();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create discovery job.");
  }

  return {
    runId: data.run_id,
    status: data.status,
    totalDiscovered: data.businesses_found,
    processed: data.processed_count,
    inserted: data.inserted_count,
    duplicates: data.duplicates_skipped,
    failures: data.failed_count,
    percentComplete: data.percent_complete,
    durationSeconds: elapsedSeconds(data.started_at),
  };
}

export async function controlLeadDiscoveryRun(params: {
  supabase: SupabaseClient;
  runId: string;
  command: "pause" | "resume" | "stop";
}) {
  const run = await loadRun(params.supabase, params.runId);

  if (params.command === "pause") {
    await persistRunProgress(params.supabase, run, {
      status:
        run.status === "completed" || run.status === "failed"
          ? run.status
          : "paused",
    });
    return loadRun(params.supabase, params.runId);
  }

  if (params.command === "resume") {
    await persistRunProgress(params.supabase, run, {
      status:
        run.status === "completed" || run.status === "failed"
          ? run.status
          : "running",
      stop_requested: false,
      error_message: null,
    });
    return loadRun(params.supabase, params.runId);
  }

  await persistRunProgress(params.supabase, run, {
    status:
      run.status === "completed" || run.status === "failed"
        ? run.status
        : "paused",
    stop_requested: true,
    error_message: "Stop requested by user.",
  });

  return loadRun(params.supabase, params.runId);
}

function advanceCursor(run: DiscoveryRunRow) {
  const nextCategoryIndex = run.next_category_index + 1;
  if (nextCategoryIndex < run.selected_categories.length) {
    return {
      areaIndex: run.next_area_index,
      categoryIndex: nextCategoryIndex,
      exhausted: false,
    };
  }

  const nextAreaIndex = run.next_area_index + 1;
  if (nextAreaIndex < run.selected_area_ids.length) {
    return {
      areaIndex: nextAreaIndex,
      categoryIndex: 0,
      exhausted: false,
    };
  }

  return {
    areaIndex: run.next_area_index,
    categoryIndex: run.next_category_index,
    exhausted: true,
  };
}

async function queueCandidatesForBatch(params: {
  supabase: SupabaseClient;
  run: DiscoveryRunRow;
  areasById: Map<string, DiscoveryArea>;
  batchSize: number;
}) {
  let discoveredAdded = 0;
  const areaIndex = params.run.next_area_index;
  const categoryIndex = params.run.next_category_index;
  let exhausted = false;

  const runRef = {
    ...params.run,
    next_area_index: areaIndex,
    next_category_index: categoryIndex,
  };

  while (
    discoveredAdded < params.batchSize &&
    params.run.businesses_found + discoveredAdded < params.run.daily_limit
  ) {
    const areaId = params.run.selected_area_ids[runRef.next_area_index];
    const categoryRaw =
      params.run.selected_categories[runRef.next_category_index];

    if (!areaId || !categoryRaw) {
      exhausted = true;
      break;
    }

    const area = params.areasById.get(areaId);
    const category = DISCOVERY_CATEGORIES.includes(
      categoryRaw as DiscoveryCategory,
    )
      ? (categoryRaw as DiscoveryCategory)
      : null;

    const cursorAfter = advanceCursor(runRef as DiscoveryRunRow);
    runRef.next_area_index = cursorAfter.areaIndex;
    runRef.next_category_index = cursorAfter.categoryIndex;

    if (!area || !category) {
      exhausted = cursorAfter.exhausted;
      if (exhausted) {
        break;
      }
      continue;
    }

    const remaining = Math.max(
      0,
      params.run.daily_limit - params.run.businesses_found - discoveredAdded,
    );

    if (remaining === 0) {
      exhausted = true;
      break;
    }

    const candidates = await discoverPublicBusinesses({
      area,
      category,
      limit: Math.min(params.batchSize, remaining),
    });

    if (candidates.length > 0) {
      const insertRows = candidates.map((candidate) => ({
        run_id: params.run.run_id,
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
      }));

      const { error: queueError } = await params.supabase
        .from("lead_discovery_run_items")
        .insert(insertRows);

      if (queueError) {
        throw new Error(queueError.message);
      }

      discoveredAdded += candidates.length;
    }

    exhausted = cursorAfter.exhausted;
    if (exhausted) {
      break;
    }
  }

  return {
    discoveredAdded,
    nextAreaIndex: runRef.next_area_index,
    nextCategoryIndex: runRef.next_category_index,
    exhausted,
  };
}

export async function processLeadDiscoveryRunBatch(params: {
  supabase: SupabaseClient;
  runId: string;
  batchSize?: number;
}): Promise<DiscoveryRunSnapshot> {
  const batchSize = Math.max(5, Math.min(params.batchSize ?? 5, 10));
  const run = await loadRun(params.supabase, params.runId);

  if (run.status === "completed" || run.status === "failed") {
    return {
      runId: run.run_id,
      status: run.status,
      totalDiscovered: run.businesses_found,
      processed: run.processed_count,
      inserted: run.inserted_count,
      duplicates: run.duplicates_skipped,
      failures: run.failed_count,
      percentComplete: run.percent_complete,
      durationSeconds: elapsedSeconds(run.started_at),
    };
  }

  if (run.stop_requested) {
    await persistRunProgress(params.supabase, run, {
      status: "failed",
      error_message: run.error_message ?? "Stopped by user.",
    });
    const failedRun = await loadRun(params.supabase, run.run_id);
    return {
      runId: failedRun.run_id,
      status: failedRun.status,
      totalDiscovered: failedRun.businesses_found,
      processed: failedRun.processed_count,
      inserted: failedRun.inserted_count,
      duplicates: failedRun.duplicates_skipped,
      failures: failedRun.failed_count,
      percentComplete: failedRun.percent_complete,
      durationSeconds: elapsedSeconds(failedRun.started_at),
    };
  }

  if (run.status === "paused") {
    return {
      runId: run.run_id,
      status: run.status,
      totalDiscovered: run.businesses_found,
      processed: run.processed_count,
      inserted: run.inserted_count,
      duplicates: run.duplicates_skipped,
      failures: run.failed_count,
      percentComplete: run.percent_complete,
      durationSeconds: elapsedSeconds(run.started_at),
    };
  }

  const workingRun: DiscoveryRunRow = {
    ...run,
    status: "running",
  };

  await persistRunProgress(params.supabase, run, { status: "running" });

  const { data: areaRows, error: areaError } = await params.supabase
    .from("lead_discovery_areas")
    .select("area_id,city,state,zip_code,radius_miles")
    .in("area_id", workingRun.selected_area_ids)
    .eq("is_active", true);

  if (areaError) {
    throw new Error(areaError.message);
  }

  const areasById = new Map<string, DiscoveryArea>();
  for (const area of (areaRows ?? []) as DiscoveryArea[]) {
    areasById.set(area.area_id, area);
  }

  const queuedBefore = await params.supabase
    .from("lead_discovery_run_items")
    .select("item_id", { count: "exact", head: true })
    .eq("run_id", workingRun.run_id)
    .eq("status", "queued");

  if (queuedBefore.error) {
    throw new Error(queuedBefore.error.message);
  }

  let updatedRun: DiscoveryRunRow = { ...workingRun };

  if ((queuedBefore.count ?? 0) < batchSize) {
    const queued = await queueCandidatesForBatch({
      supabase: params.supabase,
      run: updatedRun,
      areasById,
      batchSize,
    });

    updatedRun = {
      ...updatedRun,
      businesses_found: updatedRun.businesses_found + queued.discoveredAdded,
      next_area_index: queued.nextAreaIndex,
      next_category_index: queued.nextCategoryIndex,
    };

    await persistRunProgress(params.supabase, run, {
      businesses_found: updatedRun.businesses_found,
      next_area_index: updatedRun.next_area_index,
      next_category_index: updatedRun.next_category_index,
      status: "running",
    });
  }

  const { data: queuedItems, error: queueLoadError } = await params.supabase
    .from("lead_discovery_run_items")
    .select("item_id,area_id,city,state,category,business_name,website")
    .eq("run_id", updatedRun.run_id)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (queueLoadError) {
    throw new Error(queueLoadError.message);
  }

  let processedIncrement = 0;
  let insertedIncrement = 0;
  let duplicateIncrement = 0;
  let failureIncrement = 0;
  let confidenceTotalIncrement = 0;
  let confidenceCountIncrement = 0;

  for (const item of (queuedItems ?? []) as QueuedRunItem[]) {
    const refreshed = await loadRun(params.supabase, updatedRun.run_id);
    if (refreshed.stop_requested) {
      await persistRunProgress(params.supabase, refreshed, {
        status: "failed",
        error_message: refreshed.error_message ?? "Stopped by user.",
      });
      break;
    }

    if (refreshed.status === "paused") {
      break;
    }

    try {
      const created = await createPotentialLeadFromResearch({
        supabase: params.supabase,
        input: {
          businessName: item.business_name,
          city: item.city,
          state: item.state,
          website: item.website,
        },
        discovery: {
          discoveredVia: "discovery",
          discoveryRunId: updatedRun.run_id,
          discoveryCategory: item.category,
        },
      });

      processedIncrement += 1;

      if (created.duplicate) {
        duplicateIncrement += 1;

        await params.supabase
          .from("lead_discovery_run_items")
          .update({
            status: "duplicate",
            potential_lead_id: created.lead.potential_lead_id,
          })
          .eq("item_id", item.item_id);
      } else {
        insertedIncrement += 1;
        confidenceTotalIncrement += created.lead.ai_confidence;
        confidenceCountIncrement += 1;

        await params.supabase
          .from("lead_discovery_run_items")
          .update({
            status: "inserted",
            potential_lead_id: created.lead.potential_lead_id,
          })
          .eq("item_id", item.item_id);
      }
    } catch (error) {
      processedIncrement += 1;
      failureIncrement += 1;

      await params.supabase
        .from("lead_discovery_run_items")
        .update({
          status: "failed",
          failure_reason:
            error instanceof Error
              ? error.message
              : "Unknown processing failure",
        })
        .eq("item_id", item.item_id);
    }
  }

  const reloaded = await loadRun(params.supabase, updatedRun.run_id);

  const nextProcessed = reloaded.processed_count + processedIncrement;
  const nextInserted = reloaded.inserted_count + insertedIncrement;
  const nextDuplicates = reloaded.duplicates_skipped + duplicateIncrement;
  const nextFailures = reloaded.failed_count + failureIncrement;
  const nextConfidenceTotal =
    reloaded.confidence_total + confidenceTotalIncrement;
  const nextConfidenceCount =
    reloaded.confidence_count + confidenceCountIncrement;
  const nextAverageConfidence =
    nextConfidenceCount > 0
      ? Number((nextConfidenceTotal / nextConfidenceCount).toFixed(2))
      : 0;

  const { count: queuedRemaining, error: queuedRemainingError } =
    await params.supabase
      .from("lead_discovery_run_items")
      .select("item_id", { count: "exact", head: true })
      .eq("run_id", updatedRun.run_id)
      .eq("status", "queued");

  if (queuedRemainingError) {
    throw new Error(queuedRemainingError.message);
  }

  const cursorExhausted =
    reloaded.next_area_index >= reloaded.selected_area_ids.length ||
    reloaded.selected_categories.length === 0 ||
    reloaded.selected_area_ids.length === 0;

  const reachedLimit = nextProcessed >= reloaded.daily_limit;
  const noQueuedLeft = (queuedRemaining ?? 0) === 0;

  const shouldComplete = reachedLimit || (cursorExhausted && noQueuedLeft);

  await persistRunProgress(params.supabase, reloaded, {
    processed_count: nextProcessed,
    inserted_count: nextInserted,
    duplicates_skipped: nextDuplicates,
    failed_count: nextFailures,
    confidence_total: nextConfidenceTotal,
    confidence_count: nextConfidenceCount,
    average_confidence: nextAverageConfidence,
    status: shouldComplete ? "completed" : reloaded.status,
    percent_complete: shouldComplete
      ? 100
      : progressPercent(nextProcessed, reloaded.daily_limit, reloaded.status),
  });

  const finalRun = await loadRun(params.supabase, updatedRun.run_id);

  return {
    runId: finalRun.run_id,
    status: finalRun.status,
    totalDiscovered: finalRun.businesses_found,
    processed: finalRun.processed_count,
    inserted: finalRun.inserted_count,
    duplicates: finalRun.duplicates_skipped,
    failures: finalRun.failed_count,
    percentComplete: Number(finalRun.percent_complete),
    durationSeconds: elapsedSeconds(finalRun.started_at),
  };
}
