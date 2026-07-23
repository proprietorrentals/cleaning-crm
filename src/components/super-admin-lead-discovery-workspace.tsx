"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TARGET_CATEGORIES = [
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

type TargetCategory = (typeof TARGET_CATEGORIES)[number];
type RunStatus = "pending" | "running" | "paused" | "completed" | "failed";

type LeadDiscoveryArea = {
  area_id: string;
  city: string;
  state: string;
  zip_code: string | null;
  radius_miles: number;
  is_active: boolean;
  created_at: string;
};

type LeadDiscoveryRun = {
  run_id: string;
  status: RunStatus;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  daily_limit: number;
  selected_categories: string[];
  selected_area_ids: string[];
  businesses_found: number;
  processed_count: number;
  inserted_count: number;
  duplicates_skipped: number;
  failed_count: number;
  percent_complete: number;
  average_confidence: number;
  stop_requested: boolean;
  error_message: string | null;
};

type QueueLead = {
  potential_lead_id: string;
  business_name: string;
  city: string;
  state: string;
  status: "New" | "AI Reviewed" | "Needs Review" | "Verified" | "Rejected";
  opportunity_score: number | null;
  opportunity_grade: "A+" | "A" | "B" | "C" | "D" | null;
  ai_confidence: number;
  needs_manual_verification: boolean | null;
  organization_type: string | null;
  outsourcing_likelihood: string | null;
  procurement_notes: string | null;
  recommended_next_step: string | null;
  discovered_at: string | null;
};

type LeadDiscoveryMetrics = {
  businessesDiscoveredToday: number;
  aiReviewedToday: number;
  highConfidenceToday: number;
  needsManualVerificationToday: number;
  duplicateBusinessesSkipped: number;
  discoverySuccessRate: number;
  averageConfidence: number;
  averageOpportunityScore: number;
  gradeDistribution: Record<"A+" | "A" | "B" | "C" | "D", number>;
  acceptedCandidates: number;
  rejectedCandidates: number;
  needsResearchCandidates: number;
  averageEligibilityScore: number;
  topRejectionReasons: Array<{ reason: string; count: number }>;
  rejectionRateByProvider: Array<{
    provider: string;
    total: number;
    rejected: number;
    rejectionRate: number;
  }>;
  rejectionRateByCategory: Array<{
    category: string;
    total: number;
    rejected: number;
    rejectionRate: number;
  }>;
  topCities: Array<{ city: string; count: number }>;
  topOrganizationTypes: Array<{ organizationType: string; count: number }>;
};

type DiscoverySnapshot = {
  areas: LeadDiscoveryArea[];
  runs: LeadDiscoveryRun[];
  queue: QueueLead[];
  metrics: LeadDiscoveryMetrics;
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function titleCase(value: string | null) {
  if (!value) return "Unknown";
  return value
    .split(" ")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function statusLabel(status: RunStatus, stopRequested: boolean) {
  if (
    stopRequested &&
    (status === "paused" || status === "running" || status === "pending")
  ) {
    return "Stop Requested";
  }

  return titleCase(status);
}

export function SuperAdminLeadDiscoveryWorkspace() {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [data, setData] = useState<DiscoverySnapshot | null>(null);

  const [areaCity, setAreaCity] = useState("");
  const [areaState, setAreaState] = useState("");
  const [areaZip, setAreaZip] = useState("");
  const [areaRadius, setAreaRadius] = useState("20");

  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<
    TargetCategory[]
  >(["Office"]);
  const [dailyLimit, setDailyLimit] = useState("100");

  const processingRunRef = useRef(false);

  const latestRun = data?.runs?.[0] ?? null;
  const activeRun =
    data?.runs.find(
      (run) => run.status === "running" || run.status === "pending",
    ) ?? null;

  const loadWorkspace = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/super-admin/lead-discovery", {
        cache: "no-store",
      });
      const body = (await response.json()) as
        | ({ success: true } & DiscoverySnapshot)
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        setError(
          body.success ? "Unable to load discovery workspace." : body.message,
        );
        return;
      }

      setError(null);
      setData({
        areas: body.areas,
        runs: body.runs,
        queue: body.queue,
        metrics: body.metrics,
      });

      if (selectedAreaIds.length === 0 && body.areas.length > 0) {
        setSelectedAreaIds(body.areas.slice(0, 1).map((area) => area.area_id));
      }
    } catch {
      setError("Unable to load discovery workspace.");
    } finally {
      setLoading(false);
    }
  }, [selectedAreaIds.length]);

  const processRunBatch = useCallback(async (runId: string) => {
    if (processingRunRef.current) {
      return;
    }

    processingRunRef.current = true;

    try {
      const response = await fetch("/api/super-admin/lead-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process_run",
          payload: {
            runId,
            batchSize: 5,
          },
        }),
      });

      const body = (await response.json()) as
        | { success: true }
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        setError(
          body.success ? "Unable to process discovery batch." : body.message,
        );
      }
    } catch {
      setError("Unable to process discovery batch.");
    } finally {
      processingRunRef.current = false;
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadWorkspace();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadWorkspace]);

  useEffect(() => {
    if (!activeRun) {
      return;
    }

    const interval = window.setInterval(() => {
      void (async () => {
        await processRunBatch(activeRun.run_id);
        await loadWorkspace();
      })();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [activeRun, loadWorkspace, processRunBatch]);

  const selectedAreaCount = useMemo(
    () => selectedAreaIds.length,
    [selectedAreaIds],
  );

  const toggleArea = useCallback((areaId: string) => {
    setSelectedAreaIds((current) =>
      current.includes(areaId)
        ? current.filter((id) => id !== areaId)
        : [...current, areaId],
    );
  }, []);

  const toggleCategory = useCallback((category: TargetCategory) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((value) => value !== category)
        : [...current, category],
    );
  }, []);

  const addArea = useCallback(async () => {
    if (!areaCity.trim() || !areaState.trim()) {
      setError("City and state are required to add a discovery area.");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/super-admin/lead-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_area",
          payload: {
            city: areaCity.trim(),
            state: areaState.trim(),
            zipCode: areaZip.trim() || undefined,
            radiusMiles: Number(areaRadius) || 20,
          },
        }),
      });

      const body = (await response.json()) as
        | { success: true; area: LeadDiscoveryArea }
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        setError(body.success ? "Unable to add area." : body.message);
        return;
      }

      setSuccess("Discovery area added.");
      setAreaCity("");
      setAreaState("");
      setAreaZip("");
      setAreaRadius("20");
      await loadWorkspace();
    } catch {
      setError("Unable to add area.");
    }
  }, [areaCity, areaRadius, areaState, areaZip, loadWorkspace]);

  const runDiscovery = useCallback(async () => {
    if (selectedAreaIds.length === 0) {
      setError("Select at least one discovery area.");
      return;
    }

    if (selectedCategories.length === 0) {
      setError("Select at least one target category.");
      return;
    }

    setRunning(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/super-admin/lead-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_discovery",
          payload: {
            areaIds: selectedAreaIds,
            categories: selectedCategories,
            dailyLimit: Number(dailyLimit) || 100,
          },
        }),
      });

      const body = (await response.json()) as
        | {
            success: true;
            run: {
              runId: string;
              status: RunStatus;
            };
            message?: string;
          }
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        setError(
          body.success ? "Unable to create discovery job." : body.message,
        );
        return;
      }

      setSuccess(
        body.message ??
          "Discovery job created. Processing will continue in small batches.",
      );
      await loadWorkspace();
      await processRunBatch(body.run.runId);
      await loadWorkspace();
    } catch {
      setError("Unable to create discovery job.");
    } finally {
      setRunning(false);
    }
  }, [
    dailyLimit,
    loadWorkspace,
    processRunBatch,
    selectedAreaIds,
    selectedCategories,
  ]);

  const controlRun = useCallback(
    async (command: "pause" | "resume" | "stop") => {
      if (!latestRun) {
        setError("No run found to control.");
        return;
      }

      setError(null);
      setSuccess(null);

      try {
        const response = await fetch("/api/super-admin/lead-discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "control_run",
            payload: {
              runId: latestRun.run_id,
              command,
            },
          }),
        });

        const body = (await response.json()) as
          | { success: true; message: string }
          | { success: false; message: string };

        if (!response.ok || !body.success) {
          setError(
            body.success ? "Unable to update run status." : body.message,
          );
          return;
        }

        setSuccess(body.message);
        await loadWorkspace();
      } catch {
        setError("Unable to control run.");
      }
    },
    [latestRun, loadWorkspace],
  );

  const runQueueAction = useCallback(
    async (
      leadId: string,
      action: "verify" | "reject" | "needs_research",
      successMessage: string,
    ) => {
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(
          `/api/super-admin/potential-leads/${leadId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          },
        );

        const body = (await response.json()) as
          | { success: true }
          | { success: false; message: string };

        if (!response.ok || !body.success) {
          setError(body.success ? "Unable to update lead." : body.message);
          return;
        }

        setSuccess(successMessage);
        await loadWorkspace();
      } catch {
        setError("Unable to update discovery lead.");
      }
    },
    [loadWorkspace],
  );

  const metrics = data?.metrics;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.18),_transparent_38%),linear-gradient(180deg,_#020617_0%,_#020617_100%)] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
              Phase 2D
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Lead Discovery Engine
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Jobs run in incremental server batches to avoid long request
              timeouts, while preserving AI research safety and manual
              verification requirements.
            </p>
          </div>
          <div className="text-sm text-slate-300">
            {loading ? "Loading..." : `${selectedAreaCount} area(s) selected`}
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-700/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-2xl border border-emerald-700/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        <section className="mb-5 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/20">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Discovery Areas
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              value={areaCity}
              onChange={(event) => setAreaCity(event.target.value)}
              placeholder="City"
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <input
              value={areaState}
              onChange={(event) => setAreaState(event.target.value)}
              placeholder="State"
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <input
              value={areaZip}
              onChange={(event) => setAreaZip(event.target.value)}
              placeholder="ZIP (optional)"
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <input
              value={areaRadius}
              onChange={(event) => setAreaRadius(event.target.value)}
              placeholder="Radius (miles)"
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => void addArea()}
              className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Add Area
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(data?.areas ?? []).map((area) => {
              const active = selectedAreaIds.includes(area.area_id);
              return (
                <button
                  type="button"
                  key={area.area_id}
                  onClick={() => toggleArea(area.area_id)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    active
                      ? "border-cyan-500/70 bg-cyan-500/10 text-cyan-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-cyan-500/40"
                  }`}
                >
                  <p className="font-semibold">
                    {area.city}, {area.state}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {area.zip_code ? `${area.zip_code} | ` : ""}
                    {area.radius_miles} mile radius
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-5 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/20">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Target Categories
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {TARGET_CATEGORIES.map((category) => {
              const checked = selectedCategories.includes(category);
              return (
                <label
                  key={category}
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
                    checked
                      ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-100"
                      : "border-slate-700 bg-slate-900/70 text-slate-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(category)}
                  />
                  <span>{category}</span>
                </label>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={dailyLimit}
              onChange={(event) => setDailyLimit(event.target.value)}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100"
            >
              {[50, 100, 250, 500].map((value) => (
                <option key={value} value={value}>
                  {value} businesses/day
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={running}
              onClick={() => void runDiscovery()}
              className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {running ? "Creating Job..." : "Run Discovery"}
            </button>
            <button
              type="button"
              disabled={
                !latestRun ||
                (latestRun.status !== "running" &&
                  latestRun.status !== "pending")
              }
              onClick={() => void controlRun("pause")}
              className="rounded-full border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-100 disabled:opacity-50"
            >
              Pause
            </button>
            <button
              type="button"
              disabled={!latestRun || latestRun.status !== "paused"}
              onClick={() => void controlRun("resume")}
              className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-50"
            >
              Resume
            </button>
            <button
              type="button"
              disabled={
                !latestRun ||
                latestRun.status === "completed" ||
                latestRun.status === "failed"
              }
              onClick={() => void controlRun("stop")}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-100 disabled:opacity-50"
            >
              Stop
            </button>
          </div>
        </section>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <MetricCard
            label="Businesses discovered today"
            value={metrics?.businessesDiscoveredToday ?? 0}
          />
          <MetricCard
            label="AI reviewed"
            value={metrics?.aiReviewedToday ?? 0}
          />
          <MetricCard
            label="High confidence"
            value={metrics?.highConfidenceToday ?? 0}
          />
          <MetricCard
            label="Needs manual verification"
            value={metrics?.needsManualVerificationToday ?? 0}
          />
          <MetricCard
            label="Duplicate businesses skipped"
            value={metrics?.duplicateBusinessesSkipped ?? 0}
          />
          <MetricCard
            label="Discovery success rate"
            value={`${metrics?.discoverySuccessRate ?? 0}%`}
          />
          <MetricCard
            label="Average confidence"
            value={`${metrics?.averageConfidence ?? 0}%`}
          />
          <MetricCard
            label="Average eligibility"
            value={`${metrics?.averageEligibilityScore ?? 0}`}
          />
        </section>

        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Accepted candidates"
            value={metrics?.acceptedCandidates ?? 0}
          />
          <MetricCard
            label="Needs research candidates"
            value={metrics?.needsResearchCandidates ?? 0}
          />
          <MetricCard
            label="Rejected candidates"
            value={metrics?.rejectedCandidates ?? 0}
          />
        </section>

        <section className="mb-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Top Rejection Reasons
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              {(metrics?.topRejectionReasons ?? []).length === 0 ? (
                <p className="text-slate-500">
                  No rejected candidates yet today.
                </p>
              ) : (
                (metrics?.topRejectionReasons ?? []).map((entry) => (
                  <p key={entry.reason}>
                    {entry.reason}:{" "}
                    <span className="text-rose-200">{entry.count}</span>
                  </p>
                ))
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Rejection Rate by Provider
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              {(metrics?.rejectionRateByProvider ?? []).length === 0 ? (
                <p className="text-slate-500">
                  No provider quality data yet today.
                </p>
              ) : (
                (metrics?.rejectionRateByProvider ?? []).map((entry) => (
                  <p key={entry.provider}>
                    {entry.provider}:{" "}
                    <span className="text-amber-200">
                      {entry.rejectionRate}%
                    </span>
                  </p>
                ))
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Rejection Rate by Category
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              {(metrics?.rejectionRateByCategory ?? []).length === 0 ? (
                <p className="text-slate-500">
                  No category quality data yet today.
                </p>
              ) : (
                (metrics?.rejectionRateByCategory ?? []).map((entry) => (
                  <p key={entry.category}>
                    {entry.category}:{" "}
                    <span className="text-amber-200">
                      {entry.rejectionRate}%
                    </span>
                  </p>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mb-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Top Cities
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              {(metrics?.topCities ?? []).length === 0 ? (
                <p className="text-slate-500">No discoveries yet today.</p>
              ) : (
                (metrics?.topCities ?? []).map((entry) => (
                  <p key={entry.city}>
                    {entry.city}:{" "}
                    <span className="text-cyan-200">{entry.count}</span>
                  </p>
                ))
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Top Organization Types
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              {(metrics?.topOrganizationTypes ?? []).length === 0 ? (
                <p className="text-slate-500">No discoveries yet today.</p>
              ) : (
                (metrics?.topOrganizationTypes ?? []).map((entry) => (
                  <p key={entry.organizationType}>
                    {titleCase(entry.organizationType)}:{" "}
                    <span className="text-cyan-200">{entry.count}</span>
                  </p>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Discovery History
            </p>
            <button
              type="button"
              onClick={() => void loadWorkspace()}
              className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/40"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-2 py-2">Started</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Progress</th>
                  <th className="px-2 py-2">Discovered</th>
                  <th className="px-2 py-2">Processed</th>
                  <th className="px-2 py-2">Inserted</th>
                  <th className="px-2 py-2">Duplicates</th>
                  <th className="px-2 py-2">Failures</th>
                </tr>
              </thead>
              <tbody>
                {(data?.runs ?? []).map((run) => (
                  <tr key={run.run_id} className="border-b border-slate-900/70">
                    <td className="px-2 py-2">{formatDate(run.started_at)}</td>
                    <td className="px-2 py-2">
                      {statusLabel(run.status, run.stop_requested)}
                    </td>
                    <td className="px-2 py-2">
                      {Math.round(run.percent_complete)}%
                    </td>
                    <td className="px-2 py-2">{run.businesses_found}</td>
                    <td className="px-2 py-2">{run.processed_count}</td>
                    <td className="px-2 py-2">{run.inserted_count}</td>
                    <td className="px-2 py-2">{run.duplicates_skipped}</td>
                    <td className="px-2 py-2">{run.failed_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-2xl shadow-slate-950/20">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Discovery Queue
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Sorted by opportunity score, then AI confidence, then newest.
                Human review is required before marketplace promotion.
              </p>
            </div>
            <Link
              href="/super-admin/lead-operations/potential-leads"
              className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/40"
            >
              Open Potential Leads
            </Link>
          </div>
          {(data?.queue ?? []).length === 0 ? (
            <p className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-8 text-sm text-slate-400">
              No discovery leads in queue yet.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(data?.queue ?? []).map((lead) => (
                <article
                  key={lead.potential_lead_id}
                  className="rounded-3xl border border-slate-800 bg-slate-950/85 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {lead.business_name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {lead.city}, {lead.state}
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                      {lead.status}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-300">
                    <p>
                      Opportunity score: {lead.opportunity_score ?? "Unscored"}
                      {lead.opportunity_grade
                        ? ` (Grade ${lead.opportunity_grade})`
                        : ""}
                    </p>
                    <p>AI confidence: {Math.round(lead.ai_confidence)}%</p>
                    <p>
                      Organization:{" "}
                      {titleCase(lead.organization_type || "unknown")}
                    </p>
                    <p>
                      Outsourcing likelihood:{" "}
                      {lead.outsourcing_likelihood || "Unknown"}
                    </p>
                    <p>
                      Next step:{" "}
                      {lead.recommended_next_step || "Review details"}
                    </p>
                    <p>Discovered: {formatDate(lead.discovered_at)}</p>
                  </div>
                  {lead.procurement_notes ? (
                    <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                      {lead.procurement_notes}
                    </p>
                  ) : null}
                  {lead.needs_manual_verification ? (
                    <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                      Needs manual verification
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href="/super-admin/lead-operations/potential-leads"
                      className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/40"
                    >
                      Review
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        void runQueueAction(
                          lead.potential_lead_id,
                          "verify",
                          "Lead verified from discovery queue.",
                        )
                      }
                      className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void runQueueAction(
                          lead.potential_lead_id,
                          "reject",
                          "Lead rejected from discovery queue.",
                        )
                      }
                      className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void runQueueAction(
                          lead.potential_lead_id,
                          "needs_research",
                          "Lead moved to Needs Review from discovery queue.",
                        )
                      }
                      className="rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/20"
                    >
                      Needs More Research
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-cyan-100">{value}</p>
    </article>
  );
}
