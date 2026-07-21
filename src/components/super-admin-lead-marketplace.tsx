"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type QualificationStatus = "New" | "Needs Review" | "Verified" | "Rejected";

type LeadStatus =
  | "new"
  | "reviewing"
  | "qualified"
  | "contacted"
  | "Claimed"
  | "closed_won"
  | "closed_lost";

type LeadSummary = {
  lead_id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  square_footage: number;
  cleaning_frequency: string;
  quality_score: number;
  lead_grade: "A+" | "A" | "B" | "C" | "D";
  qualification_status: QualificationStatus;
  estimated_monthly_value: number;
  estimated_annual_value: number;
  close_probability: number;
  duplicate_risk: number;
  spam_risk: number;
  qualification_summary: string | null;
  claimed_at: string | null;
  claimed_by_user_email: string | null;
  verified_at: string | null;
  created_at: string;
};

type LeadDetail = LeadSummary & {
  address: string;
  service_requested: string;
  budget: string | null;
  preferred_start_date: string;
  notes: string | null;
  photo_urls?: string[] | null;
  urgency_score: number;
  completeness_score: number;
  qualification_summary: string | null;
  scoring_breakdown: Record<string, unknown> | null;
  internal_notes: string | null;
  claimed_by_user_id: string | null;
  claimed_company_id: string | null;
  claimed_sales_lead_id: string | null;
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

type ClaimTimelineItem = {
  leadId: string;
  businessName: string;
  city: string;
  state: string;
  leadGrade: string;
  qualityScore: number;
  estimatedAnnualValue: number;
  qualificationStatus: QualificationStatus;
  claimedAt: string;
  changedAt: string;
  changeSummary: string | null;
  metadata: Record<string, unknown>;
};

type CreditBalance = {
  tenant_id: string;
  balance: number;
  lifetime_purchased: number;
  lifetime_spent: number;
  lifetime_refunded: number;
  lifetime_promotional: number;
  lifetime_adjustment: number;
  last_transaction_at: string | null;
  updated_at: string | null;
};

type CreditTransaction = {
  id: string;
  tenant_id: string;
  transaction_type:
    | "purchased"
    | "spent"
    | "refunded"
    | "promotional"
    | "adjustment";
  credits_delta: number;
  balance_after: number;
  reference_key: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_by_user_id: string | null;
  created_at: string;
};

type LeadCreditPackage = {
  id: "starter" | "growth" | "professional";
  name: string;
  credits: number;
  amountCents: number;
  description: string;
};

type RecoveryResponseBody = {
  success: boolean;
  message?: string;
  recovered?: boolean;
  alreadyCredited?: boolean;
};

type FilterState = {
  search: string;
  state: string;
  city: string;
  grade: string;
  propertyType: string;
  minContractValue: string;
  maxContractValue: string;
  verifiedOnly: boolean;
  unclaimedOnly: boolean;
};

const INITIAL_FILTERS: FilterState = {
  search: "",
  state: "",
  city: "",
  grade: "",
  propertyType: "",
  minContractValue: "",
  maxContractValue: "",
  verifiedOnly: false,
  unclaimedOnly: false,
};

const GRADE_STYLES: Record<string, string> = {
  "A+": "border-emerald-400/40 bg-emerald-400/15 text-emerald-100",
  A: "border-emerald-400/40 bg-emerald-400/15 text-emerald-100",
  B: "border-cyan-400/40 bg-cyan-400/15 text-cyan-100",
  C: "border-amber-400/40 bg-amber-400/15 text-amber-100",
  D: "border-orange-400/40 bg-orange-400/15 text-orange-100",
  F: "border-rose-400/40 bg-rose-400/15 text-rose-100",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyPrecise(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getGradeStyle(grade: string) {
  return GRADE_STYLES[grade] ?? GRADE_STYLES.F;
}

function getGradeLabel(grade: string) {
  return `AI Grade ${grade}`;
}

function getInsightSummary(lead: LeadSummary | LeadDetail) {
  return (
    lead.qualification_summary ??
    `Strong ${lead.property_type.toLowerCase()} opportunity in ${lead.city}, ${lead.state} with ${lead.square_footage.toLocaleString()} sq ft.`
  );
}

export function SuperAdminLeadMarketplace() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [claimingLead, setClaimingLead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const [history, setHistory] = useState<AuditEvent[]>([]);
  const [claimTimeline, setClaimTimeline] = useState<ClaimTimelineItem[]>([]);
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(
    null,
  );
  const [creditTransactions, setCreditTransactions] = useState<
    CreditTransaction[]
  >([]);
  const [creditPackages, setCreditPackages] = useState<LeadCreditPackage[]>([]);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [creditActionLoading, setCreditActionLoading] = useState(false);
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(
    null,
  );
  const [recoveringPurchase, setRecoveringPurchase] = useState(false);
  const [recoverSessionId, setRecoverSessionId] = useState("");
  const [legacyRecoveryConfirmed, setLegacyRecoveryConfirmed] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentDelta, setAdjustmentDelta] = useState("1");
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

  const marketplaceMetrics = useMemo(() => {
    const now = new Date();
    const verifiedLeads = leads.filter((lead) =>
      Boolean(lead.verified_at),
    ).length;
    const claimedToday = leads.filter(
      (lead) =>
        lead.claimed_at &&
        new Date(lead.claimed_at).toDateString() === now.toDateString(),
    ).length;
    const averageContractValue =
      leads.length === 0
        ? 0
        : Math.round(
            leads.reduce(
              (total, lead) => total + lead.estimated_monthly_value,
              0,
            ) / leads.length,
          );

    return {
      availableCredits: creditBalance?.balance ?? 0,
      verifiedLeads,
      claimedToday,
      averageContractValue,
    };
  }, [creditBalance?.balance, leads]);

  const loadLeads = useCallback(async (nextFilters: FilterState) => {
    setLoadingList(true);
    setError(null);

    const params = new URLSearchParams();
    if (nextFilters.search.trim())
      params.set("search", nextFilters.search.trim());
    if (nextFilters.state.trim()) params.set("state", nextFilters.state.trim());
    if (nextFilters.city.trim()) params.set("city", nextFilters.city.trim());
    if (nextFilters.grade.trim()) params.set("grade", nextFilters.grade.trim());
    if (nextFilters.propertyType.trim())
      params.set("propertyType", nextFilters.propertyType.trim());
    if (nextFilters.minContractValue.trim())
      params.set("minContractValue", nextFilters.minContractValue.trim());
    if (nextFilters.maxContractValue.trim())
      params.set("maxContractValue", nextFilters.maxContractValue.trim());
    if (nextFilters.verifiedOnly) params.set("verified", "true");
    if (nextFilters.unclaimedOnly) params.set("unclaimed", "true");

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
      setSelectedLeadId((current) =>
        current && body.leads.some((lead) => lead.lead_id === current)
          ? current
          : null,
      );
    } catch {
      setError("Unable to load leads.");
    } finally {
      setLoadingList(false);
    }
  }, []);

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

  const loadClaimTimeline = useCallback(async () => {
    try {
      const response = await fetch("/api/super-admin/lead-marketplace/claims");
      const body = (await response.json()) as
        | { success: true; timeline: ClaimTimelineItem[] }
        | { success: false; message: string };
      if (!response.ok || !body.success) return;
      setClaimTimeline(body.timeline);
    } catch {
      setClaimTimeline([]);
    }
  }, []);

  const loadCredits = useCallback(async () => {
    setLoadingCredits(true);

    try {
      const response = await fetch("/api/super-admin/lead-marketplace/credits");
      const body = (await response.json()) as
        | {
            success: true;
            balance: CreditBalance;
            transactions: CreditTransaction[];
            packages: LeadCreditPackage[];
          }
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        return;
      }

      setCreditBalance(body.balance);
      setCreditTransactions(body.transactions);
      setCreditPackages(body.packages);
    } catch {
      setCreditBalance(null);
      setCreditTransactions([]);
      setCreditPackages([]);
    } finally {
      setLoadingCredits(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads(INITIAL_FILTERS);
  }, [loadLeads]);

  useEffect(() => {
    void loadClaimTimeline();
  }, [loadClaimTimeline]);

  useEffect(() => {
    void loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const purchaseStatus = query.get("creditsPurchase");
    if (!purchaseStatus) return;

    if (purchaseStatus === "success") {
      setSuccess("Payment successful. Credits have been refreshed.");
      void loadCredits();
    } else if (purchaseStatus === "cancelled") {
      setError("Payment cancelled. No credits were added.");
      void loadCredits();
    }

    const cleanedUrl = new URL(window.location.href);
    cleanedUrl.searchParams.delete("creditsPurchase");
    cleanedUrl.searchParams.delete("session_id");
    window.history.replaceState({}, "", cleanedUrl.toString());
  }, [loadCredits]);

  useEffect(() => {
    if (selectedLeadId) void loadLeadDetail(selectedLeadId);
  }, [selectedLeadId, loadLeadDetail]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (selectedLeadId) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedLeadId]);

  const refreshAll = useCallback(async () => {
    await loadLeads(filters);
    if (selectedLeadId) await loadLeadDetail(selectedLeadId);
    await loadClaimTimeline();
    await loadCredits();
  }, [
    filters,
    loadLeads,
    loadLeadDetail,
    selectedLeadId,
    loadClaimTimeline,
    loadCredits,
  ]);

  const purchaseCreditPackage = useCallback(async (packageId: string) => {
    setPurchasingPackageId(packageId);
    setError(null);

    try {
      const response = await fetch(
        "/api/super-admin/lead-marketplace/credits/checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageId }),
        },
      );

      const body = (await response.json()) as
        | { success: true; url: string }
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        setError(body.success ? "Unable to start checkout." : body.message);
        return;
      }

      window.location.href = body.url;
    } catch {
      setError("Unable to start package checkout.");
    } finally {
      setPurchasingPackageId(null);
    }
  }, []);

  const runCreditAdjustment = useCallback(
    async (action: "refund" | "adjustment") => {
      setCreditActionLoading(true);
      setError(null);

      try {
        const parsedDelta = Number(adjustmentDelta);
        const payload =
          action === "refund"
            ? {
                action,
                credits: Math.max(
                  1,
                  Number.isFinite(parsedDelta) ? parsedDelta : 1,
                ),
                reason:
                  adjustmentReason.trim() ||
                  "Super Admin approved refund for marketplace credits.",
              }
            : {
                action,
                creditsDelta: Number.isFinite(parsedDelta) ? parsedDelta : 0,
                reason:
                  adjustmentReason.trim() ||
                  "Super Admin manual credit adjustment.",
              };

        const response = await fetch(
          "/api/super-admin/lead-marketplace/credits",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        const body = (await response.json()) as
          | { success: true }
          | { success: false; message: string };

        if (!response.ok || !body.success) {
          setError(body.success ? "Credit update failed." : body.message);
          return;
        }

        setSuccess(
          action === "refund"
            ? "Marketplace credit refund applied."
            : "Marketplace credit adjustment applied.",
        );
        await loadCredits();
      } catch {
        setError("Unable to apply credit update.");
      } finally {
        setCreditActionLoading(false);
      }
    },
    [adjustmentDelta, adjustmentReason, loadCredits],
  );

  const recoverPaidPurchase = useCallback(async () => {
    const checkoutSessionId = recoverSessionId.trim();
    if (!checkoutSessionId) {
      setError("Enter a Stripe Checkout Session ID to recover.");
      return;
    }

    setRecoveringPurchase(true);
    setError(null);
    setSuccess(null);
    let shouldRefreshCredits = false;

    try {
      const response = await fetch(
        "/api/super-admin/lead-marketplace/credits/recover",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkoutSessionId,
            legacyPreTenantMetadataConfirmed: legacyRecoveryConfirmed,
          }),
        },
      );

      shouldRefreshCredits = true;

      const rawBody = await response.text();
      let body: RecoveryResponseBody | null = null;
      if (rawBody.trim().length > 0) {
        try {
          body = JSON.parse(rawBody) as RecoveryResponseBody;
        } catch {
          body = null;
        }
      }

      const errorMessage =
        body?.message?.trim() ||
        `Recovery failed (${response.status}${response.statusText ? ` ${response.statusText}` : ""}).`;

      if (!response.ok || !body?.success) {
        setError(errorMessage);
        return;
      }

      setSuccess(
        body.recovered
          ? "Paid credit purchase recovered and applied."
          : "This paid session was already credited (no duplicate credits applied).",
      );
      setRecoverSessionId("");
      setLegacyRecoveryConfirmed(false);
    } catch {
      setError("Unable to recover paid credit purchase.");
    } finally {
      if (shouldRefreshCredits) await loadCredits();
      setRecoveringPurchase(false);
    }
  }, [legacyRecoveryConfirmed, loadCredits, recoverSessionId]);

  const claimLead = useCallback(
    async (lead: LeadSummary | LeadDetail) => {
      const currentBalance = creditBalance?.balance ?? 0;
      const confirmed = window.confirm(
        `Claim ${lead.business_name} for 1 credit?\n\nLead cost: 1\nCurrent balance: ${currentBalance}\nBalance after claim: ${Math.max(currentBalance - 1, 0)}`,
      );

      if (!confirmed) return;

      setClaimingLead(true);
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch(
          `/api/super-admin/lead-marketplace/${lead.lead_id}/claim`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          },
        );

        const body = (await response.json()) as
          | {
              success: true;
              claim: {
                taskCount: number;
                claimedCompanyId: string;
                claimedSalesLeadId: string;
                leadCost?: number;
                currentBalance?: number;
                balanceAfterClaim?: number;
              };
            }
          | { success: false; message: string };

        if (!response.ok || !body.success) {
          setError(body.success ? "Unable to claim lead." : body.message);
          return;
        }

        const before = body.claim.currentBalance;
        const after = body.claim.balanceAfterClaim;
        const leadCost = body.claim.leadCost ?? 1;
        setSuccess(
          Number.isFinite(before) && Number.isFinite(after)
            ? `Lead claimed. Cost ${leadCost} credit. Balance ${before} -> ${after}. ${body.claim.taskCount} AI tasks generated.`
            : `Lead claimed, CRM records imported, and ${body.claim.taskCount} AI tasks generated.`,
        );
        await refreshAll();
      } catch {
        setError("Unexpected error while claiming lead.");
      } finally {
        setClaimingLead(false);
      }
    },
    [creditBalance?.balance, refreshAll],
  );

  const runLeadAction = useCallback(
    async (
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
    },
    [refreshAll, selectedLeadId],
  );

  const closeLeadDrawer = useCallback(() => {
    setSelectedLeadId(null);
    setSelectedLead(null);
    setHistory([]);
  }, []);

  const selectedLeadIsClaimed = Boolean(selectedLead?.claimed_at);
  const selectedLeadCanClaim = Boolean(
    selectedLead &&
      selectedLead.qualification_status === "Verified" &&
      !selectedLead.claimed_at &&
      (creditBalance?.balance ?? 0) > 0,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.16),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#020617_50%,_#020617_100%)] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
              Phase 4A
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Lead Marketplace
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Premium lead cards, live claim flow, credit controls, and Super
              Admin verification tools.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-cyan-500/50 hover:bg-slate-800"
          >
            Refresh
          </button>
        </header>

        <section className="mb-5 grid gap-4 rounded-3xl border border-cyan-900/60 bg-cyan-950/20 p-4 shadow-2xl shadow-cyan-950/20 lg:grid-cols-[1.08fr_1fr]">
          <div className="rounded-2xl border border-cyan-800/70 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">
              Lead Credit Balance
            </p>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-4xl font-semibold text-cyan-100">
                {loadingCredits ? "..." : (creditBalance?.balance ?? 0)}
              </p>
              <p className="pb-1 text-xs text-cyan-200/75">available credits</p>
            </div>
            <div className="mt-4 grid gap-2 text-xs text-cyan-100/90 sm:grid-cols-2">
              <p>Purchased: {creditBalance?.lifetime_purchased ?? 0}</p>
              <p>Spent: {creditBalance?.lifetime_spent ?? 0}</p>
              <p>Refunded: {creditBalance?.lifetime_refunded ?? 0}</p>
              <p>Promotional: {creditBalance?.lifetime_promotional ?? 0}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Purchase Credits
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {creditPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-2xl border border-slate-700/80 bg-slate-900/85 p-3"
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {pkg.name}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {pkg.description}
                  </p>
                  <p className="mt-3 text-sm text-cyan-200">
                    {pkg.credits} credits
                  </p>
                  <p className="text-lg font-semibold text-cyan-100">
                    {formatCurrencyPrecise(pkg.amountCents / 100)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void purchaseCreditPackage(pkg.id)}
                    disabled={purchasingPackageId === pkg.id}
                    className="mt-3 w-full rounded-full bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {purchasingPackageId === pkg.id ? "Opening..." : "Buy"}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Super Admin Refund / Adjustment
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  value={adjustmentDelta}
                  onChange={(event) => setAdjustmentDelta(event.target.value)}
                  placeholder="Credits"
                  className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                />
                <input
                  value={adjustmentReason}
                  onChange={(event) => setAdjustmentReason(event.target.value)}
                  placeholder="Reason"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => void runCreditAdjustment("refund")}
                  disabled={creditActionLoading}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  Refund
                </button>
                <button
                  type="button"
                  onClick={() => void runCreditAdjustment("adjustment")}
                  disabled={creditActionLoading}
                  className="rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  Adjust
                </button>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Recover Paid Credit Purchase
              </p>
              <p className="mt-1 text-[11px] leading-4 text-slate-400">
                Use this only for legacy purchases that were paid before tenant
                metadata was added.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  value={recoverSessionId}
                  onChange={(event) => setRecoverSessionId(event.target.value)}
                  placeholder="Stripe Checkout Session ID (cs_...)"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                />
                <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={legacyRecoveryConfirmed}
                    onChange={(event) =>
                      setLegacyRecoveryConfirmed(event.target.checked)
                    }
                  />
                  Legacy pre-tenant-metadata purchase
                </label>
                <button
                  type="button"
                  onClick={() => void recoverPaidPurchase()}
                  disabled={recoveringPurchase || !legacyRecoveryConfirmed}
                  className="rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {recoveringPurchase ? "Recovering..." : "Recover Purchase"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 grid gap-3 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-xl shadow-slate-950/20 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Available Credits"
            value={marketplaceMetrics.availableCredits}
          />
          <Metric
            label="Verified Leads"
            value={marketplaceMetrics.verifiedLeads}
          />
          <Metric
            label="Claimed Today"
            value={marketplaceMetrics.claimedToday}
          />
          <Metric
            label="Average Contract Value"
            value={formatCurrency(marketplaceMetrics.averageContractValue)}
          />
        </section>

        <section className="mb-5 rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-2xl shadow-slate-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Search and filters
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-100">
                Narrow the marketplace
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void loadLeads(filters)}
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Apply Filters
            </button>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
            <input
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Search business, contact, email, phone, or address"
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <input
                value={filters.state}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    state: event.target.value,
                  }))
                }
                placeholder="State"
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
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
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
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
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              />
              <select
                value={filters.grade}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    grade: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100"
              >
                <option value="">AI Grade</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={filters.minContractValue}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    minContractValue: event.target.value,
                  }))
                }
                placeholder="Min contract value"
                inputMode="numeric"
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              />
              <input
                value={filters.maxContractValue}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    maxContractValue: event.target.value,
                  }))
                }
                placeholder="Max contract value"
                inputMode="numeric"
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      verifiedOnly: event.target.checked,
                    }))
                  }
                />
                Verified
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.unclaimedOnly}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      unclaimedOnly: event.target.checked,
                    }))
                  }
                />
                Unclaimed
              </label>
            </div>
            <div className="flex items-center justify-end text-xs text-slate-400">
              Use search plus filters to shape the live marketplace feed.
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
        {(creditBalance?.balance ?? 0) <= 0 ? (
          <div className="mb-4 rounded-2xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
            No credits available. Purchase a package or apply a refund or
            adjustment to continue claiming verified leads.
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-2xl shadow-slate-950/20">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Marketplace Leads
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-100">
                Premium responsive cards
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Showing {leads.length} leads {loadingList ? "· loading" : ""}
            </p>
          </div>
          {leads.length === 0 ? (
            <p className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-8 text-sm text-slate-400">
              No leads match the current filters.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {leads.map((lead) => {
                const isClaimed = Boolean(lead.claimed_at);
                const canClaim =
                  lead.qualification_status === "Verified" &&
                  !isClaimed &&
                  (creditBalance?.balance ?? 0) > 0;
                return (
                  <article
                    key={lead.lead_id}
                    className={`group rounded-3xl border p-5 transition duration-200 ${selectedLeadId === lead.lead_id ? "border-cyan-500/60 bg-cyan-500/10 shadow-lg shadow-cyan-950/30" : "border-slate-800 bg-slate-950/80 hover:border-cyan-500/30 hover:bg-slate-900/80"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {lead.business_name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {lead.city}, {lead.state}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getGradeStyle(lead.lead_grade)}`}
                        >
                          {getGradeLabel(lead.lead_grade)}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-200">
                          {lead.qualification_status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Estimated monthly contract value
                        </p>
                        <p className="mt-1 text-xl font-semibold text-cyan-100">
                          {formatCurrency(lead.estimated_monthly_value)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          Close probability
                        </p>
                        <p className="mt-1 text-xl font-semibold text-slate-100">
                          {Math.round(lead.close_probability * 100)}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                        {lead.property_type}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                        {lead.square_footage.toLocaleString()} sq ft
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                        {lead.cleaning_frequency}
                      </span>
                      {isClaimed ? (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                          Claimed
                        </span>
                      ) : (
                        <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                          Open
                        </span>
                      )}
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">
                        AI Insight
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-200">
                        {getInsightSummary(lead)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                        <span>Quality {lead.quality_score}/100</span>
                        <span>
                          Dup {Math.round(lead.duplicate_risk * 100)}%
                        </span>
                        <span>Spam {Math.round(lead.spam_risk * 100)}%</span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLeadId(lead.lead_id)}
                        className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-cyan-500/50 hover:bg-slate-800"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        disabled={!canClaim || claimingLead}
                        onClick={() => void claimLead(lead)}
                        className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isClaimed ? "Claimed" : "Claim"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-2xl shadow-slate-950/20">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
            Credit Transaction History
          </p>
          {creditTransactions.length === 0 ? (
            <p className="text-xs text-slate-400">
              No credit transactions yet.
            </p>
          ) : (
            <div className="space-y-2">
              {creditTransactions.slice(0, 8).map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-200">
                      {tx.transaction_type}{" "}
                      {tx.credits_delta > 0
                        ? `+${tx.credits_delta}`
                        : tx.credits_delta}
                    </p>
                    <p className="text-slate-400">{tx.reason || "No reason"}</p>
                  </div>
                  <div className="text-right text-slate-400">
                    <p>Balance: {tx.balance_after}</p>
                    <p>{formatDate(tx.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedLeadId ? (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Close lead drawer"
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
              onClick={closeLeadDrawer}
            />
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col border-l border-slate-800 bg-slate-950 shadow-2xl shadow-cyan-950/30">
              <div className="border-b border-slate-800 bg-slate-950/95 px-5 py-4">
                {!selectedLead ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Lead preview
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-100">
                        Loading lead details...
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={closeLeadDrawer}
                      className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">
                        Lead preview
                      </p>
                      <h2 className="mt-1 text-2xl font-semibold text-white">
                        {selectedLead.business_name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
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
                        onClick={() =>
                          void loadLeadDetail(selectedLead.lead_id)
                        }
                        className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        disabled={
                          savingAction || claimingLead || !selectedLeadCanClaim
                        }
                        onClick={() => void claimLead(selectedLead)}
                        className="rounded-full bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                      >
                        {selectedLeadIsClaimed ? "Claimed" : "Claim Lead"}
                      </button>
                      <button
                        type="button"
                        disabled={savingAction}
                        onClick={() =>
                          void runLeadAction(
                            { action: "verify" },
                            "Lead verified and timestamped.",
                          )
                        }
                        className="rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
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
                        className="rounded-full bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
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
                        className="rounded-full border border-cyan-500/50 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50"
                      >
                        Re-run Qualification
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                {!selectedLead ? (
                  <p className="text-sm text-slate-400">
                    {loadingDetail
                      ? "Loading lead details..."
                      : "Select a lead to inspect and take action."}
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Metric
                        label="Status"
                        value={`${selectedLead.qualification_status} / ${selectedLead.status}`}
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
                        label="Monthly Value"
                        value={formatCurrency(
                          selectedLead.estimated_monthly_value,
                        )}
                      />
                      <Metric
                        label="Annual Value"
                        value={formatCurrency(
                          selectedLead.estimated_annual_value,
                        )}
                      />
                      <Metric
                        label="Square Footage"
                        value={selectedLead.square_footage.toLocaleString()}
                      />
                      <Metric
                        label="Cleaning Frequency"
                        value={selectedLead.cleaning_frequency}
                      />
                    </div>
                    {selectedLead.claimed_at ? (
                      <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                        <p className="font-semibold">Claimed</p>
                        <p className="mt-1 text-emerald-100/90">
                          Claimed by{" "}
                          {selectedLead.claimed_by_user_email ??
                            "a Super Admin"}{" "}
                          on {formatDate(selectedLead.claimed_at)}.
                        </p>
                      </div>
                    ) : null}
                    <div className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                        Claim Preview
                      </p>
                      <div className="mt-3 grid gap-3 text-sm text-cyan-50 sm:grid-cols-2">
                        <div>
                          <p className="text-cyan-100/80">Lead cost</p>
                          <p className="font-semibold">1 credit</p>
                        </div>
                        <div>
                          <p className="text-cyan-100/80">Current balance</p>
                          <p className="font-semibold">
                            {creditBalance?.balance ?? 0} credits
                          </p>
                        </div>
                        <div>
                          <p className="text-cyan-100/80">
                            Balance after claim
                          </p>
                          <p className="font-semibold">
                            {Math.max((creditBalance?.balance ?? 0) - 1, 0)}{" "}
                            credits
                          </p>
                        </div>
                        <div>
                          <p className="text-cyan-100/80">Customer import</p>
                          <p className="font-semibold">
                            {selectedLead.business_name} /{" "}
                            {selectedLead.contact_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-cyan-100/80">Opportunity source</p>
                          <p className="font-semibold">
                            Lead Marketplace claim workflow
                          </p>
                        </div>
                        <div>
                          <p className="text-cyan-100/80">AI tasks generated</p>
                          <p className="font-semibold">
                            6 role-specific assignments
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        AI Insight
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                        {selectedLead.qualification_summary ||
                          "No summary yet."}
                      </p>
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Uploaded Photos
                      </p>
                      {(selectedLead.photo_urls ?? []).length === 0 ? (
                        <p className="mt-2 text-xs text-slate-400">
                          No photos uploaded for this lead.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
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
                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Scoring Breakdown
                      </p>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-300">
                        {JSON.stringify(
                          selectedLead.scoring_breakdown ?? {},
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Super Admin Override
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                        className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
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
                          className="rounded-full bg-cyan-600 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-500 disabled:opacity-50"
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
                          className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                        >
                          Save Notes
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Audit History
                      </p>
                      <div className="mt-2 space-y-2">
                        {history.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            No audit events yet.
                          </p>
                        ) : (
                          history.map((event) => (
                            <div
                              key={event.id}
                              className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2"
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
                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Claim Timeline
                      </p>
                      {claimTimeline.length === 0 ? (
                        <p className="mt-2 text-xs text-slate-400">
                          No recent claim activity yet.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-3">
                          {claimTimeline.slice(0, 6).map((item) => (
                            <div
                              key={`${item.leadId}-${item.changedAt}`}
                              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-100">
                                    {item.businessName}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {item.city}, {item.state} · Grade{" "}
                                    {item.leadGrade} · {item.qualityScore}/100
                                  </p>
                                </div>
                                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                                  Claimed
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-slate-300">
                                {item.changeSummary ||
                                  "Claim imported into CRM."}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {formatDate(item.changedAt)} · Potential value{" "}
                                {formatCurrency(item.estimatedAnnualValue)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
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
