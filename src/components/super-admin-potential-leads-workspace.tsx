"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LeadScope = "potential" | "verified" | "research";

type PotentialLeadStatus =
  | "New"
  | "AI Reviewed"
  | "Needs Review"
  | "Verified"
  | "Rejected";

type PotentialLead = {
  potential_lead_id: string;
  business_name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  property_type: string;
  estimated_building_size: string | null;
  estimated_monthly_contract_value: number | null;
  contract_value_confidence: number;
  outsourcing_likelihood: "High" | "Medium" | "Low" | "Unknown";
  organization_type:
    | "public sector"
    | "education"
    | "healthcare"
    | "office"
    | "industrial"
    | "retail"
    | "multifamily"
    | "nonprofit"
    | "unknown";
  opportunity_summary: string | null;
  recommended_next_step: string | null;
  procurement_notes: string | null;
  estimated_contract_value: number;
  ai_confidence: number;
  ai_reasoning: string | null;
  research_notes: string | null;
  research_sources: Array<{
    name: string;
    url: string | null;
    note: string | null;
  }> | null;
  needs_manual_verification: boolean | null;
  status: PotentialLeadStatus;
  verified_marketplace_lead_id: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type WorkspaceProps = {
  scope: LeadScope;
  title: string;
  description: string;
};

type ScopeConfig = {
  href: string;
  label: string;
  description: string;
};

const SCOPE_LINKS: Record<LeadScope, ScopeConfig> = {
  potential: {
    href: "/super-admin/lead-operations/potential-leads",
    label: "Potential Leads",
    description:
      "New and in-progress opportunities waiting for final decisions.",
  },
  verified: {
    href: "/super-admin/lead-operations/verified-leads",
    label: "Verified Leads",
    description:
      "Leads already promoted into marketplace_leads via verification workflow.",
  },
  research: {
    href: "/super-admin/lead-operations/research-queue",
    label: "Research Queue",
    description:
      "Leads flagged for deeper review before marketplace promotion.",
  },
};

const STATUS_STYLES: Record<PotentialLeadStatus, string> = {
  New: "border-sky-500/50 bg-sky-500/10 text-sky-100",
  "AI Reviewed": "border-cyan-500/50 bg-cyan-500/10 text-cyan-100",
  "Needs Review": "border-amber-500/50 bg-amber-500/10 text-amber-100",
  Verified: "border-emerald-500/50 bg-emerald-500/10 text-emerald-100",
  Rejected: "border-rose-500/50 bg-rose-500/10 text-rose-100",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyOrUnknown(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "Needs Estimate";
  }

  return formatCurrency(value);
}

function formatOrganizationType(value: PotentialLead["organization_type"]) {
  if (value === "unknown") {
    return "Unknown";
  }

  return value
    .split(" ")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SuperAdminPotentialLeadsWorkspace({
  scope,
  title,
  description,
}: WorkspaceProps) {
  const [loading, setLoading] = useState(false);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [researchBusinessName, setResearchBusinessName] = useState("");
  const [researchCity, setResearchCity] = useState("");
  const [researchState, setResearchState] = useState("");
  const [researchWebsite, setResearchWebsite] = useState("");
  const [researching, setResearching] = useState(false);
  const [focusedLeadId, setFocusedLeadId] = useState<string | null>(null);
  const [leads, setLeads] = useState<PotentialLead[]>([]);
  const leadCardRefs = useRef<Record<string, HTMLElement | null>>({});

  const filteredCountLabel = useMemo(() => {
    if (loading) return "Loading...";
    return `${leads.length} lead${leads.length === 1 ? "" : "s"}`;
  }, [leads.length, loading]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ scope });
    if (search.trim()) params.set("search", search.trim());

    try {
      const response = await fetch(
        `/api/super-admin/potential-leads?${params.toString()}`,
      );

      const body = (await response.json()) as
        | { success: true; leads: PotentialLead[] }
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        setError(
          body.success ? "Failed to load potential leads." : body.message,
        );
        return;
      }

      setLeads(body.leads);
    } catch {
      setError("Unable to load potential leads.");
    } finally {
      setLoading(false);
    }
  }, [scope, search]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    if (!focusedLeadId) {
      return;
    }

    const card = leadCardRefs.current[focusedLeadId];
    if (!card) {
      return;
    }

    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.focus({ preventScroll: true });
  }, [focusedLeadId]);

  const runLeadAction = useCallback(
    async (
      leadId: string,
      action: "verify" | "reject" | "needs_research",
      successMessage: string,
    ) => {
      setSavingLeadId(leadId);
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
          | { success: true; marketplaceLeadId?: string }
          | { success: false; message: string };

        if (!response.ok || !body.success) {
          setError(body.success ? "Unable to update lead." : body.message);
          return;
        }

        if (action === "verify" && body.marketplaceLeadId) {
          setSuccess(
            `${successMessage} Marketplace Lead ID: ${body.marketplaceLeadId}`,
          );
        } else {
          setSuccess(successMessage);
        }

        await loadLeads();
      } catch {
        setError("Unexpected error while updating lead.");
      } finally {
        setSavingLeadId(null);
      }
    },
    [loadLeads],
  );

  const runResearch = useCallback(async () => {
    if (!researchBusinessName.trim()) {
      setError("Business name is required for research.");
      return;
    }

    setResearching(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/super-admin/potential-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: researchBusinessName.trim(),
          city: researchCity.trim() || undefined,
          state: researchState.trim() || undefined,
          website: researchWebsite.trim() || undefined,
        }),
      });

      const body = (await response.json()) as
        | {
            success: true;
            duplicate: boolean;
            message: string;
            lead: PotentialLead;
          }
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        setError(body.success ? "Unable to research business." : body.message);
        return;
      }

      setSuccess(body.message);
      await loadLeads();
      setFocusedLeadId(body.lead.potential_lead_id);

      if (!body.duplicate) {
        setResearchBusinessName("");
        setResearchCity("");
        setResearchState("");
        setResearchWebsite("");
      }
    } catch {
      setError("Unable to research this business right now.");
    } finally {
      setResearching(false);
    }
  }, [
    loadLeads,
    researchBusinessName,
    researchCity,
    researchState,
    researchWebsite,
  ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.18),_transparent_38%),linear-gradient(180deg,_#020617_0%,_#020617_100%)] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
              Phase 2C
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              {description}
            </p>
          </div>
          <div className="text-sm text-slate-300">{filteredCountLabel}</div>
        </header>

        <section className="mb-5 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/20">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Lead Operations
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-4">
            <WorkspaceLink scope={scope} targetScope="potential" />
            <WorkspaceLink scope={scope} targetScope="verified" />
            <Link
              href="/super-admin/lead-marketplace"
              className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-900"
            >
              <p className="font-semibold">Marketplace</p>
              <p className="mt-1 text-xs text-slate-400">
                Existing claim, credits, and AI task workflows.
              </p>
            </Link>
            <WorkspaceLink scope={scope} targetScope="research" />
          </div>
        </section>

        <section className="mb-5 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-xl shadow-slate-950/20">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Search Existing Leads
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search business, website, email, phone, or address"
                  className="min-w-[220px] flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => void loadLeads()}
                  className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-900/70 bg-cyan-950/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                Research New Business
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  value={researchBusinessName}
                  onChange={(event) =>
                    setResearchBusinessName(event.target.value)
                  }
                  placeholder="Business name"
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 sm:col-span-2"
                />
                <input
                  value={researchCity}
                  onChange={(event) => setResearchCity(event.target.value)}
                  placeholder="City (optional)"
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                />
                <input
                  value={researchState}
                  onChange={(event) => setResearchState(event.target.value)}
                  placeholder="State (optional)"
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
                />
                <input
                  value={researchWebsite}
                  onChange={(event) => setResearchWebsite(event.target.value)}
                  placeholder="Website (optional)"
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 sm:col-span-2"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-cyan-100/80">
                  Uses only public data and always requires human verification.
                </p>
                <button
                  type="button"
                  disabled={researching}
                  onClick={() => void runResearch()}
                  className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {researching ? "Researching..." : "Research"}
                </button>
              </div>
            </div>
          </div>
        </section>

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

        <section className="rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-2xl shadow-slate-950/20">
          {leads.length === 0 ? (
            <p className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-8 text-sm text-slate-400">
              No leads found for this view.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {leads.map((lead) => {
                const disabled = savingLeadId === lead.potential_lead_id;
                return (
                  <article
                    key={lead.potential_lead_id}
                    ref={(element) => {
                      leadCardRefs.current[lead.potential_lead_id] = element;
                    }}
                    tabIndex={-1}
                    className="rounded-3xl border border-slate-800 bg-slate-950/85 p-5 transition hover:border-cyan-500/30"
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
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[lead.status]}`}
                      >
                        {lead.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-300">
                      <p>
                        <span className="text-slate-500">Website:</span>{" "}
                        {lead.website ? (
                          <a
                            href={
                              lead.website.startsWith("http")
                                ? lead.website
                                : `https://${lead.website}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-300 hover:text-cyan-200"
                          >
                            {lead.website}
                          </a>
                        ) : (
                          "-"
                        )}
                      </p>
                      <p>
                        <span className="text-slate-500">Phone:</span>{" "}
                        {lead.phone || "-"}
                      </p>
                      <p>
                        <span className="text-slate-500">Email:</span>{" "}
                        {lead.email || "-"}
                      </p>
                      <p className="line-clamp-2">
                        <span className="text-slate-500">Address:</span>{" "}
                        {lead.address}
                      </p>
                      <p>
                        <span className="text-slate-500">Property type:</span>{" "}
                        {lead.property_type}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          Annual Contract
                        </p>
                        <p className="mt-1 text-sm font-semibold text-cyan-100">
                          {formatCurrencyOrUnknown(
                            lead.estimated_contract_value,
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          AI Confidence
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {Math.round(lead.ai_confidence)}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          Monthly Estimate
                        </p>
                        <p className="mt-1 text-sm font-semibold text-cyan-100">
                          {formatCurrencyOrUnknown(
                            lead.estimated_monthly_contract_value,
                          )}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Confidence:{" "}
                          {Math.round(lead.contract_value_confidence)}%
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          Building Size
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {lead.estimated_building_size || "Unknown"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          Organization Type
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {formatOrganizationType(lead.organization_type)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          Outsourcing Likelihood
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {lead.outsourcing_likelihood}
                        </p>
                      </div>
                    </div>

                    {lead.needs_manual_verification ? (
                      <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                        Needs Manual Verification
                      </p>
                    ) : null}

                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80">
                        AI Reasoning
                      </p>
                      <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-200">
                        {lead.ai_reasoning || "No AI reasoning provided."}
                      </p>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80">
                        Opportunity Summary
                      </p>
                      <p className="mt-2 line-clamp-5 text-sm leading-6 text-slate-200">
                        {lead.opportunity_summary ||
                          "Opportunity assessment is still being verified."}
                      </p>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Recommended Next Step
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-200">
                        {lead.recommended_next_step ||
                          "Research property manager"}
                      </p>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Procurement Notes
                      </p>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-300">
                        {lead.procurement_notes ||
                          "No public procurement flags identified."}
                      </p>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Research notes
                      </p>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-300">
                        {lead.research_notes || "No research notes yet."}
                      </p>
                    </div>

                    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Sources
                      </p>
                      {lead.research_sources &&
                      lead.research_sources.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-slate-300">
                          {lead.research_sources
                            .slice(0, 4)
                            .map((source, index) => (
                              <li
                                key={`${lead.potential_lead_id}-source-${index}`}
                              >
                                {source.url ? (
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-cyan-300 hover:text-cyan-200"
                                  >
                                    {source.name}
                                  </a>
                                ) : (
                                  <span>{source.name}</span>
                                )}
                                {source.note ? ` - ${source.note}` : ""}
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-slate-500">
                          No public source list saved.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 text-xs text-slate-500">
                      <p>Created: {formatDate(lead.created_at)}</p>
                      <p>Last reviewed: {formatDate(lead.reviewed_at)}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={disabled || lead.status === "Verified"}
                        onClick={() =>
                          void runLeadAction(
                            lead.potential_lead_id,
                            "verify",
                            "Lead verified and promoted into marketplace workflow.",
                          )
                        }
                        className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        disabled={disabled || lead.status === "Rejected"}
                        onClick={() =>
                          void runLeadAction(
                            lead.potential_lead_id,
                            "reject",
                            "Lead rejected from potential queue.",
                          )
                        }
                        className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={disabled || lead.status === "Needs Review"}
                        onClick={() =>
                          void runLeadAction(
                            lead.potential_lead_id,
                            "needs_research",
                            "Lead moved to Needs Review.",
                          )
                        }
                        className="rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                      >
                        Needs More Research
                      </button>
                    </div>

                    {lead.verified_marketplace_lead_id ? (
                      <p className="mt-3 text-xs text-emerald-300">
                        Marketplace Lead: {lead.verified_marketplace_lead_id}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function WorkspaceLink({
  scope,
  targetScope,
}: {
  scope: LeadScope;
  targetScope: LeadScope;
}) {
  const config = SCOPE_LINKS[targetScope];
  const active = scope === targetScope;

  return (
    <Link
      href={config.href}
      className={`rounded-2xl border px-4 py-3 text-sm transition ${
        active
          ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-100"
          : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-cyan-500/40 hover:bg-slate-900"
      }`}
    >
      <p className="font-semibold">{config.label}</p>
      <p className="mt-1 text-xs text-slate-400">{config.description}</p>
    </Link>
  );
}
