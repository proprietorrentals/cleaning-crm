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
  quality_score: number;
  lead_grade: "A+" | "A" | "B" | "C" | "D";
  qualification_status: QualificationStatus;
  estimated_monthly_value: number;
  estimated_annual_value: number;
  close_probability: number;
  duplicate_risk: number;
  spam_risk: number;
  claimed_at: string | null;
  claimed_by_user_email: string | null;
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
  claimed_at: string | null;
  claimed_by_user_id: string | null;
  claimed_by_user_email: string | null;
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

type ClaimInsights = {
  recentClaimCount: number;
  revenuePotential: number;
  aiTasksGenerated: number;
  claimSuccessRate: number;
  funnel: {
    verified: number;
    claimed: number;
    open: number;
    won: number;
    lost: number;
  };
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

const STATUS_VIEW_LABELS: Record<FilterState["view"], string> = {
  All: "All",
  New: "Submitted Leads",
  "Needs Review": "Needs Review",
  Verified: "Verified",
  Rejected: "Rejected",
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
  const [claimInsights, setClaimInsights] = useState<ClaimInsights | null>(
    null,
  );
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

  const loadClaimInsights = useCallback(async () => {
    try {
      const response = await fetch("/api/super-admin/lead-marketplace/claims");
      const body = (await response.json()) as
        | {
            success: true;
            metrics: ClaimInsights;
            timeline: ClaimTimelineItem[];
          }
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        return;
      }

      setClaimInsights(body.metrics);
      setClaimTimeline(body.timeline);
    } catch {
      setClaimInsights(null);
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
    void loadClaimInsights();
  }, [loadClaimInsights]);

  useEffect(() => {
    void loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const purchaseStatus = query.get("creditsPurchase");
    if (!purchaseStatus) {
      return;
    }

    if (purchaseStatus === "success") {
      setSuccess("Payment successful. Credits have been refreshed.");
      setError(null);
      void loadCredits();
    } else if (purchaseStatus === "cancelled") {
      setError("Payment cancelled. No credits were added.");
      setSuccess(null);
      void loadCredits();
    }

    const cleanedUrl = new URL(window.location.href);
    cleanedUrl.searchParams.delete("creditsPurchase");
    cleanedUrl.searchParams.delete("session_id");
    window.history.replaceState({}, "", cleanedUrl.toString());
  }, [loadCredits]);

  useEffect(() => {
    if (!selectedLeadId) return;
    void loadLeadDetail(selectedLeadId);
  }, [selectedLeadId, loadLeadDetail]);

  const refreshAll = useCallback(async () => {
    await loadLeads(filters);
    if (selectedLeadId) {
      await loadLeadDetail(selectedLeadId);
    }
    await loadClaimInsights();
    await loadCredits();
  }, [
    filters,
    loadLeads,
    loadLeadDetail,
    selectedLeadId,
    loadClaimInsights,
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

    try {
      const response = await fetch(
        "/api/super-admin/lead-marketplace/credits/recover",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkoutSessionId }),
        },
      );

      const body = (await response.json()) as
        | {
            success: true;
            recovered: boolean;
          }
        | { success: false; message: string };

      if (!response.ok || !body.success) {
        setError(body.success ? "Recovery failed." : body.message);
        return;
      }

      setSuccess(
        body.recovered
          ? "Paid credit purchase recovered and applied."
          : "This paid session was already credited (no duplicate credits applied).",
      );
      setRecoverSessionId("");
      await loadCredits();
    } catch {
      setError("Unable to recover paid credit purchase.");
    } finally {
      setRecoveringPurchase(false);
    }
  }, [loadCredits, recoverSessionId]);

  const claimLead = useCallback(async () => {
    if (!selectedLeadId || !selectedLead) return;

    const currentBalance = creditBalance?.balance ?? 0;
    const confirmed = window.confirm(
      `Claim this lead for 1 credit?\n\nLead cost: 1\nCurrent balance: ${currentBalance}\nBalance after claim: ${Math.max(currentBalance - 1, 0)}`,
    );

    if (!confirmed) {
      return;
    }

    setClaimingLead(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/super-admin/lead-marketplace/${selectedLeadId}/claim`,
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
  }, [creditBalance?.balance, refreshAll, selectedLead, selectedLeadId]);

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

  const selectedLeadIsClaimed = selectedLead?.status === "Claimed";

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

        <section className="mb-5 grid gap-4 rounded-2xl border border-cyan-900/60 bg-cyan-950/30 p-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-xl border border-cyan-800/60 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-300">
              Lead Credit Balance
            </p>
            <p className="mt-2 text-3xl font-semibold text-cyan-100">
              {loadingCredits ? "..." : (creditBalance?.balance ?? 0)}
            </p>
            <p className="mt-1 text-xs text-cyan-200/80">Available credits</p>
            <div className="mt-3 grid gap-2 text-xs text-cyan-100/90 sm:grid-cols-2">
              <p>Purchased: {creditBalance?.lifetime_purchased ?? 0}</p>
              <p>Spent: {creditBalance?.lifetime_spent ?? 0}</p>
              <p>Refunded: {creditBalance?.lifetime_refunded ?? 0}</p>
              <p>Promotional: {creditBalance?.lifetime_promotional ?? 0}</p>
            </div>
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                How Lead Credits Work
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-200">
                <li>You receive 1 free credit to try the marketplace.</li>
                <li>Each verified lead costs 1 credit.</li>
                <li>Credits are deducted only after a successful claim.</li>
                <li>Failed claims do not use credits.</li>
                <li>Approved refunds restore credits.</li>
                <li>More credits can be purchased at any time.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Purchase Credits
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {creditPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-lg border border-slate-700 bg-slate-900/80 p-3"
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {pkg.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {pkg.description}
                  </p>
                  <p className="mt-2 text-sm text-cyan-200">
                    {pkg.credits} credits
                  </p>
                  <p className="text-lg font-semibold text-cyan-100">
                    {formatCurrencyPrecise(pkg.amountCents / 100)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void purchaseCreditPackage(pkg.id)}
                    disabled={purchasingPackageId === pkg.id}
                    className="mt-3 w-full rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {purchasingPackageId === pkg.id ? "Opening..." : "Buy"}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">
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

            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Recover Paid Credit Purchase
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  value={recoverSessionId}
                  onChange={(event) => setRecoverSessionId(event.target.value)}
                  placeholder="Stripe Checkout Session ID (cs_...)"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => void recoverPaidPurchase()}
                  disabled={recoveringPurchase}
                  className="rounded-lg border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {recoveringPurchase ? "Recovering..." : "Recover Purchase"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Recent Claims"
            value={claimInsights?.recentClaimCount ?? 0}
          />
          <Metric
            label="Revenue Potential"
            value={formatCurrency(claimInsights?.revenuePotential ?? 0)}
          />
          <Metric
            label="AI Tasks Generated"
            value={claimInsights?.aiTasksGenerated ?? 0}
          />
          <Metric
            label="Claim Success Rate"
            value={`${claimInsights?.claimSuccessRate ?? 0}%`}
          />
          <Metric
            label="Open / Claimed"
            value={`${claimInsights?.funnel.open ?? 0} / ${claimInsights?.funnel.claimed ?? 0}`}
          />
        </section>

        <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">
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
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs"
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
              {STATUS_VIEW_LABELS[view]} ({leadCountByView[view] ?? 0})
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

        {(creditBalance?.balance ?? 0) <= 0 ? (
          <div className="mb-4 rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-100">
            No credits available. Purchase a package or apply a
            refund/adjustment to continue claiming verified leads.
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1.05fr_1.35fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70">
            <header className="border-b border-slate-800 px-4 py-3 text-sm text-slate-400">
              Leads ({leads.length}) {loadingList ? "· loading" : ""}
            </header>
            <div className="max-h-[70vh] overflow-auto">
              {leads.map((lead) => (
                <div
                  key={lead.lead_id}
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-200">
                        {lead.qualification_status}
                      </span>
                      {lead.claimed_at ? (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200">
                          Claimed
                        </span>
                      ) : null}
                    </div>
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
                  {lead.claimed_at ? (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Claimed by {lead.claimed_by_user_email ?? "a Super Admin"}{" "}
                      on {formatDate(lead.claimed_at)}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(lead.lead_id)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      disabled={
                        lead.qualification_status !== "Verified" ||
                        Boolean(lead.claimed_at) ||
                        (creditBalance?.balance ?? 0) <= 0
                      }
                      onClick={() => {
                        setSelectedLeadId(lead.lead_id);
                        void loadLeadDetail(lead.lead_id);
                      }}
                      className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {lead.claimed_at ? "Claimed" : "Claim Lead"}
                    </button>
                  </div>
                </div>
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
                      onClick={() => void loadLeadDetail(selectedLead.lead_id)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      disabled={
                        savingAction ||
                        claimingLead ||
                        selectedLeadIsClaimed ||
                        selectedLead.qualification_status !== "Verified" ||
                        (creditBalance?.balance ?? 0) <= 0
                      }
                      onClick={() => void claimLead()}
                      className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
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

                {selectedLead.claimed_at ? (
                  <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-50">
                    <p className="font-semibold">Claimed</p>
                    <p className="mt-1 text-emerald-100/90">
                      Claimed by{" "}
                      {selectedLead.claimed_by_user_email ?? "a Super Admin"} on{" "}
                      {formatDate(selectedLead.claimed_at)}.
                    </p>
                  </div>
                ) : null}

                <div className="mb-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-cyan-200">
                    Claim Preview
                  </p>
                  <div className="grid gap-3 text-sm text-cyan-50 sm:grid-cols-2">
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
                      <p className="text-cyan-100/80">Balance after claim</p>
                      <p className="font-semibold">
                        {Math.max((creditBalance?.balance ?? 0) - 1, 0)} credits
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
                    <div>
                      <p className="text-cyan-100/80">Timeline entry</p>
                      <p className="font-semibold">
                        Claim audit + platform event
                      </p>
                    </div>
                  </div>
                </div>

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

                <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                    Claim Timeline
                  </p>
                  {claimTimeline.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No recent claim activity yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {claimTimeline.slice(0, 6).map((item) => (
                        <div
                          key={`${item.leadId}-${item.changedAt}`}
                          className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"
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
                            {item.changeSummary || "Claim imported into CRM."}
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
          </section>
        </div>
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
