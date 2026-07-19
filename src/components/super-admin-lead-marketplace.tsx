"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type QualificationStatus = "New" | "Needs Review" | "Verified" | "Rejected";

type LeadSummary = {
  lead_id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  quality_score: number;
  lead_grade: "A+" | "A" | "B" | "C" | "D";
  qualification_status: QualificationStatus;
  estimated_monthly_value: number;
  estimated_annual_value: number;
  close_probability: number;
  duplicate_risk: number;
  spam_risk: number;
  created_at: string;
};

type LeadDetail = LeadSummary & {
  address: string;
  square_footage: number;
  cleaning_frequency: string;
  service_requested: string;
  budget: string | null;
  preferred_start_date: string;
  notes: string | null;
  photo_urls?: string[] | null;
  urgency_score: number;
  completeness_score: number;
  qualification_summary: string | null;
  scoring_breakdown: Record<string, unknown> | null;
  verified_at: string | null;
  internal_notes: string | null;
  updated_at: string;
};

type AuditEvent = {
  id: string;
  changed_at: string;
  changed_by: string | null;
  action: string;
  change_summary: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
};

type FilterState = {
  view: QualificationStatus | "All";
  search: string;
  grade: string;
  city: string;
  zip: string;
  propertyType: string;
  status: string;
  minScore: string;
  maxScore: string;
  fromDate: string;
  toDate: string;
};

const INITIAL_FILTERS: FilterState = {
  view: "All",
  search: "",
  grade: "",
  city: "",
  zip: "",
  propertyType: "",
  status: "",
  minScore: "",
  maxScore: "",
  fromDate: "",
  toDate: "",
};

const STATUS_VIEWS: Array<FilterState["view"]> = [
  "All",
  "New",
  "Needs Review",
  "Verified",
  "Rejected",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SuperAdminLeadMarketplace() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const [history, setHistory] = useState<AuditEvent[]>([]);

  const [overrideDraft, setOverrideDraft] = useState({
    qualityScore: "",
    leadGrade: "",
    estimatedMonthlyValue: "",
    estimatedAnnualValue: "",
    closeProbabilityPercent: "",
    qualificationStatus: "",
    urgencyScore: "",
    completenessScore: "",
    internalNotes: "",
  });

  const leadCountByView = useMemo(() => {
    const counts: Record<string, number> = {
      All: leads.length,
      New: 0,
      "Needs Review": 0,
      Verified: 0,
      Rejected: 0,
    };

    for (const lead of leads) {
      counts[lead.qualification_status] =
        (counts[lead.qualification_status] ?? 0) + 1;
    }

    return counts;
  }, [leads]);

  const loadLeads = useCallback(
    async (nextFilters: FilterState) => {
      setLoadingList(true);
      setError(null);

      const params = new URLSearchParams();
      if (nextFilters.view !== "All") params.set("view", nextFilters.view);
      if (nextFilters.search.trim())
        params.set("search", nextFilters.search.trim());
      if (nextFilters.grade.trim())
        params.set("grade", nextFilters.grade.trim());
      if (nextFilters.city.trim()) params.set("city", nextFilters.city.trim());
      if (nextFilters.zip.trim()) params.set("zip", nextFilters.zip.trim());
      if (nextFilters.propertyType.trim())
        params.set("propertyType", nextFilters.propertyType.trim());
      if (nextFilters.status.trim())
        params.set("status", nextFilters.status.trim());
      if (nextFilters.minScore.trim())
        params.set("minScore", nextFilters.minScore.trim());
      if (nextFilters.maxScore.trim())
        params.set("maxScore", nextFilters.maxScore.trim());
      if (nextFilters.fromDate.trim())
        params.set("fromDate", nextFilters.fromDate.trim());
      if (nextFilters.toDate.trim())
        params.set("toDate", nextFilters.toDate.trim());

      try {
        const response = await fetch(
          `/api/super-admin/lead-marketplace?${params.toString()}`,
        );
        const body = (await response.json()) as
          | { success: true; leads: LeadSummary[] }
          | { success: false; message: string };

        if (!response.ok || !body.success) {
          setError(body.success ? "Failed to load leads." : body.message);
          return;
        }

        setLeads(body.leads);

        if (!selectedLeadId && body.leads.length > 0) {
          setSelectedLeadId(body.leads[0].lead_id);
        }

        if (
          selectedLeadId &&
          !body.leads.some((lead) => lead.lead_id === selectedLeadId)
        ) {
          setSelectedLeadId(body.leads[0]?.lead_id ?? null);
        }
      } catch {
        setError("Unable to load leads.");
      } finally {
        setLoadingList(false);
      }
    },
    [selectedLeadId],
  );

  const loadLeadDetail = useCallback(async (leadId: string) => {
    setLoadingDetail(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/super-admin/lead-marketplace/${leadId}`,
      );
      const body = (await response.json()) as
        | { success: true; lead: LeadDetail; history: AuditEvent[] }
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        setError(body.success ? "Unable to load lead detail." : body.message);
        return;
      }

      setSelectedLead(body.lead);
      setHistory(body.history);
      setOverrideDraft({
        qualityScore: String(body.lead.quality_score),
        leadGrade: body.lead.lead_grade,
        estimatedMonthlyValue: String(body.lead.estimated_monthly_value),
        estimatedAnnualValue: String(body.lead.estimated_annual_value),
        closeProbabilityPercent: String(
          Math.round(body.lead.close_probability * 100),
        ),
        qualificationStatus: body.lead.qualification_status,
        urgencyScore: String(body.lead.urgency_score),
        completenessScore: String(body.lead.completeness_score),
        internalNotes: body.lead.internal_notes ?? "",
      });
    } catch {
      setError("Unable to load lead detail.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads(INITIAL_FILTERS);
  }, [loadLeads]);

  useEffect(() => {
    if (!selectedLeadId) return;
    void loadLeadDetail(selectedLeadId);
  }, [selectedLeadId, loadLeadDetail]);

  const refreshAll = useCallback(async () => {
    await loadLeads(filters);
    if (selectedLeadId) {
      await loadLeadDetail(selectedLeadId);
    }
  }, [filters, loadLeads, loadLeadDetail, selectedLeadId]);

  const runLeadAction = async (
    payload:
      | { action: "verify" }
      | { action: "reject"; changeSummary?: string }
      | { action: "requalify" }
      | { action: "notes"; internalNotes: string }
      | {
          action: "override";
          qualityScore?: number;
          leadGrade?: "A+" | "A" | "B" | "C" | "D";
          estimatedMonthlyValue?: number;
          estimatedAnnualValue?: number;
          closeProbability?: number;
          qualificationStatus?: QualificationStatus;
          urgencyScore?: number;
          completenessScore?: number;
          internalNotes?: string;
          changeSummary?: string;
        },
    successMessage: string,
  ) => {
    if (!selectedLeadId) return;

    setSavingAction(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/super-admin/lead-marketplace/${selectedLeadId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json()) as
        | { success: true; lead: LeadDetail }
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        setError(body.success ? "Could not update lead." : body.message);
        return;
      }

      setSuccess(successMessage);
      await refreshAll();
    } catch {
      setError("Unexpected error while updating lead.");
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Lead Marketplace
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Deterministic qualification, duplicate risk scoring, and Super
              Admin verification controls.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
          >
            Refresh
          </button>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          {STATUS_VIEWS.map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => {
                const next = { ...filters, view };
                setFilters(next);
                void loadLeads(next);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filters.view === view
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {view} ({leadCountByView[view] ?? 0})
            </button>
          ))}
        </div>

        <section className="mb-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-2 lg:grid-cols-6">
          <input
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            placeholder="Search business, contact, email"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            value={filters.city}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                city: event.target.value,
              }))
            }
            placeholder="City"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            value={filters.zip}
            onChange={(event) =>
              setFilters((current) => ({ ...current, zip: event.target.value }))
            }
            placeholder="ZIP"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            value={filters.propertyType}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                propertyType: event.target.value,
              }))
            }
            placeholder="Property type"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            value={filters.grade}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                grade: event.target.value,
              }))
            }
            placeholder="Grade"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              value={filters.minScore}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  minScore: event.target.value,
                }))
              }
              placeholder="Min score"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              value={filters.maxScore}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  maxScore: event.target.value,
                }))
              }
              placeholder="Max"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                fromDate: event.target.value,
              }))
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={filters.toDate}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                toDate: event.target.value,
              }))
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void loadLeads(filters)}
            className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-500"
          >
            Apply Filters
          </button>
        </section>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-700/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-xl border border-emerald-700/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1.05fr_1.35fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70">
            <header className="border-b border-slate-800 px-4 py-3 text-sm text-slate-400">
              Leads ({leads.length}) {loadingList ? "· loading" : ""}
            </header>
            <div className="max-h-[70vh] overflow-auto">
              {leads.map((lead) => (
                <button
                  key={lead.lead_id}
                  type="button"
                  onClick={() => setSelectedLeadId(lead.lead_id)}
                  className={`w-full border-b border-slate-800 px-4 py-3 text-left transition hover:bg-slate-800/50 ${
                    selectedLeadId === lead.lead_id ? "bg-slate-800/70" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {lead.business_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {lead.contact_name} · {lead.city}, {lead.state}
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-200">
                      {lead.qualification_status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                    <span>Score {lead.quality_score}</span>
                    <span>Grade {lead.lead_grade}</span>
                    <span>
                      {(lead.close_probability * 100).toFixed(0)}% close
                    </span>
                    <span>
                      {formatCurrency(lead.estimated_monthly_value)}/mo
                    </span>
                  </div>
                  <div className="mt-1 flex gap-3 text-[11px] text-slate-500">
                    <span>Dup {Math.round(lead.duplicate_risk * 100)}%</span>
                    <span>Spam {Math.round(lead.spam_risk * 100)}%</span>
                    <span>{formatDate(lead.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            {!selectedLead ? (
              <p className="text-sm text-slate-400">
                {loadingDetail
                  ? "Loading lead details..."
                  : "Select a lead to inspect and take action."}
              </p>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {selectedLead.business_name}
                    </h2>
                    <p className="text-sm text-slate-400">
                      {selectedLead.contact_name} · {selectedLead.email} ·{" "}
                      {selectedLead.phone}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedLead.address}, {selectedLead.city},{" "}
                      {selectedLead.state} {selectedLead.zip_code}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingAction}
                      onClick={() =>
                        void runLeadAction(
                          { action: "verify" },
                          "Lead verified and timestamped.",
                        )
                      }
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                    >
                      Verify Lead
                    </button>
                    <button
                      type="button"
                      disabled={savingAction}
                      onClick={() =>
                        void runLeadAction(
                          {
                            action: "reject",
                            changeSummary:
                              "Rejected from lead review workspace.",
                          },
                          "Lead marked as rejected.",
                        )
                      }
                      className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
                    >
                      Reject Lead
                    </button>
                    <button
                      type="button"
                      disabled={savingAction}
                      onClick={() =>
                        void runLeadAction(
                          { action: "requalify" },
                          "Qualification re-ran successfully.",
                        )
                      }
                      className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
                    >
                      Re-run Qualification
                    </button>
                  </div>
                </div>

                <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric
                    label="Status"
                    value={selectedLead.qualification_status}
                  />
                  <Metric
                    label="Quality"
                    value={`${selectedLead.quality_score}/100`}
                  />
                  <Metric label="Grade" value={selectedLead.lead_grade} />
                  <Metric
                    label="Close Probability"
                    value={`${Math.round(selectedLead.close_probability * 100)}%`}
                  />
                  <Metric
                    label="Urgency"
                    value={`${selectedLead.urgency_score}/100`}
                  />
                  <Metric
                    label="Completeness"
                    value={`${selectedLead.completeness_score}/100`}
                  />
                  <Metric
                    label="Duplicate Risk"
                    value={`${Math.round(selectedLead.duplicate_risk * 100)}%`}
                  />
                  <Metric
                    label="Spam Risk"
                    value={`${Math.round(selectedLead.spam_risk * 100)}%`}
                  />
                  <Metric
                    label="Monthly Value"
                    value={formatCurrency(selectedLead.estimated_monthly_value)}
                  />
                  <Metric
                    label="Annual Value"
                    value={formatCurrency(selectedLead.estimated_annual_value)}
                  />
                  <Metric
                    label="Submitted"
                    value={formatDate(selectedLead.created_at)}
                  />
                  <Metric
                    label="Updated"
                    value={formatDate(selectedLead.updated_at)}
                  />
                </div>

                {selectedLead.duplicate_risk >= 0.5 ||
                selectedLead.spam_risk >= 0.4 ? (
                  <div className="mb-4 rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    Warning: lead has elevated risk signals. Duplicate risk{" "}
                    {Math.round(selectedLead.duplicate_risk * 100)}%, spam risk{" "}
                    {Math.round(selectedLead.spam_risk * 100)}%.
                  </div>
                ) : null}

                <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                    Qualification Summary
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-slate-200">
                    {selectedLead.qualification_summary || "No summary yet."}
                  </p>
                </div>

                <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                    Uploaded Photos
                  </p>
                  {(selectedLead.photo_urls ?? []).length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No photos uploaded for this lead.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(selectedLead.photo_urls ?? []).map((url, index) => (
                        <a
                          key={`${selectedLead.lead_id}-photo-${index}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs text-cyan-300 hover:text-cyan-200"
                        >
                          View uploaded photo {index + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                    Scoring Breakdown
                  </p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-300">
                    {JSON.stringify(
                      selectedLead.scoring_breakdown ?? {},
                      null,
                      2,
                    )}
                  </pre>
                </div>

                <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                    Super Admin Override
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <LabeledInput
                      label="Quality score"
                      value={overrideDraft.qualityScore}
                      onChange={(value) =>
                        setOverrideDraft((current) => ({
                          ...current,
                          qualityScore: value,
                        }))
                      }
                    />
                    <LabeledInput
                      label="Lead grade"
                      value={overrideDraft.leadGrade}
                      onChange={(value) =>
                        setOverrideDraft((current) => ({
                          ...current,
                          leadGrade: value,
                        }))
                      }
                    />
                    <LabeledInput
                      label="Monthly value"
                      value={overrideDraft.estimatedMonthlyValue}
                      onChange={(value) =>
                        setOverrideDraft((current) => ({
                          ...current,
                          estimatedMonthlyValue: value,
                        }))
                      }
                    />
                    <LabeledInput
                      label="Annual value"
                      value={overrideDraft.estimatedAnnualValue}
                      onChange={(value) =>
                        setOverrideDraft((current) => ({
                          ...current,
                          estimatedAnnualValue: value,
                        }))
                      }
                    />
                    <LabeledInput
                      label="Close %"
                      value={overrideDraft.closeProbabilityPercent}
                      onChange={(value) =>
                        setOverrideDraft((current) => ({
                          ...current,
                          closeProbabilityPercent: value,
                        }))
                      }
                    />
                    <LabeledInput
                      label="Qualification status"
                      value={overrideDraft.qualificationStatus}
                      onChange={(value) =>
                        setOverrideDraft((current) => ({
                          ...current,
                          qualificationStatus: value,
                        }))
                      }
                    />
                    <LabeledInput
                      label="Urgency score"
                      value={overrideDraft.urgencyScore}
                      onChange={(value) =>
                        setOverrideDraft((current) => ({
                          ...current,
                          urgencyScore: value,
                        }))
                      }
                    />
                    <LabeledInput
                      label="Completeness score"
                      value={overrideDraft.completenessScore}
                      onChange={(value) =>
                        setOverrideDraft((current) => ({
                          ...current,
                          completenessScore: value,
                        }))
                      }
                    />
                  </div>

                  <label
                    htmlFor="internalNotes"
                    className="mt-3 block text-xs text-slate-400"
                  >
                    Internal notes
                  </label>
                  <textarea
                    id="internalNotes"
                    rows={4}
                    value={overrideDraft.internalNotes}
                    onChange={(event) =>
                      setOverrideDraft((current) => ({
                        ...current,
                        internalNotes: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingAction}
                      onClick={() => {
                        const closePct = Number(
                          overrideDraft.closeProbabilityPercent,
                        );
                        void runLeadAction(
                          {
                            action: "override",
                            qualityScore: Number.isFinite(
                              Number(overrideDraft.qualityScore),
                            )
                              ? Number(overrideDraft.qualityScore)
                              : undefined,
                            leadGrade: ["A+", "A", "B", "C", "D"].includes(
                              overrideDraft.leadGrade,
                            )
                              ? (overrideDraft.leadGrade as
                                  | "A+"
                                  | "A"
                                  | "B"
                                  | "C"
                                  | "D")
                              : undefined,
                            estimatedMonthlyValue: Number.isFinite(
                              Number(overrideDraft.estimatedMonthlyValue),
                            )
                              ? Number(overrideDraft.estimatedMonthlyValue)
                              : undefined,
                            estimatedAnnualValue: Number.isFinite(
                              Number(overrideDraft.estimatedAnnualValue),
                            )
                              ? Number(overrideDraft.estimatedAnnualValue)
                              : undefined,
                            closeProbability: Number.isFinite(closePct)
                              ? Math.max(0, Math.min(1, closePct / 100))
                              : undefined,
                            qualificationStatus: [
                              "New",
                              "Needs Review",
                              "Verified",
                              "Rejected",
                            ].includes(overrideDraft.qualificationStatus)
                              ? (overrideDraft.qualificationStatus as QualificationStatus)
                              : undefined,
                            urgencyScore: Number.isFinite(
                              Number(overrideDraft.urgencyScore),
                            )
                              ? Number(overrideDraft.urgencyScore)
                              : undefined,
                            completenessScore: Number.isFinite(
                              Number(overrideDraft.completenessScore),
                            )
                              ? Number(overrideDraft.completenessScore)
                              : undefined,
                            internalNotes: overrideDraft.internalNotes,
                            changeSummary:
                              "Manual score/value/status override from Super Admin workspace.",
                          },
                          "Manual override saved.",
                        );
                      }}
                      className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-500 disabled:opacity-50"
                    >
                      Save Override
                    </button>
                    <button
                      type="button"
                      disabled={savingAction}
                      onClick={() =>
                        void runLeadAction(
                          {
                            action: "notes",
                            internalNotes: overrideDraft.internalNotes,
                          },
                          "Internal notes updated.",
                        )
                      }
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                    >
                      Save Notes
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                    Audit History
                  </p>
                  <div className="space-y-2">
                    {history.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No audit events yet.
                      </p>
                    ) : (
                      history.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2"
                        >
                          <p className="text-xs font-semibold text-slate-200">
                            {event.action} · {formatDate(event.changed_at)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {event.change_summary || "No summary"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
      />
    </label>
  );
}
