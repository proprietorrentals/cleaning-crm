"use client";

import { createClient } from "@/lib/supabase/client";
import { ServiceFlowBrand } from "@/components/serviceflow-brand";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type JobRecord = {
  id: string;
  customer_id: string;
  scheduled_date: string;
  scheduled_start_time: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  signature_url: string | null;
  signature_status: string | null;
  assigned_employee_id: string | null;
  estimated_value: number | null;
};

type TimeEntryRecord = {
  id: string;
  employee_id: string;
  job_id: string | null;
  clock_out_time: string | null;
};

type InvoiceRecord = {
  id: string;
  amount: number | null;
  status: string | null;
  due_date: string;
  created_at: string;
  payment_date: string | null;
};

type MileageRequestRecord = {
  id: string;
  status: string;
};

type JobPhotoRecord = {
  id: string;
  job_id: string;
  photo_type: string;
};

type LateAlertRecord = {
  id: string;
  employee_id: string;
  employee_name: string;
  customer_name: string;
  minutes_late: number;
  status: string;
};

type MetricCard = {
  label: string;
  value: string;
  tone: string;
};

type AiAlert = {
  id: string;
  title: string;
  description: string;
  count: number;
  severity: "high" | "medium" | "low";
  href: string;
};

type HealthBreakdown = {
  onTimeArrivals: number;
  completedJobs: number;
  photoCompliance: number;
  signatureCompliance: number;
  mileageApprovals: number;
  invoiceHealth: number;
};

type DashboardState = {
  loading: boolean;
  metrics: {
    employeesWorking: number;
    employeesDriving: number;
    lateEmployees: number;
    jobsScheduledToday: number;
    jobsInProgress: number;
    jobsCompletedToday: number;
    revenueToday: number;
    pendingMileageApprovals: number;
    outstandingInvoices: number;
  };
  healthScore: number;
  healthLabel: string;
  healthBreakdown: HealthBreakdown;
  alerts: AiAlert[];
};

const navigationItems = [
  { label: "Dashboard",  href: "/",          active: true, icon: "▣" },
  { label: "Customers",  href: "/customers",               icon: "◫" },
  { label: "Quotes",     href: "/quotes",                  icon: "◧" },
  { label: "Jobs",       href: "/jobs",                    icon: "◔" },
  { label: "Employees",  href: "/employees",               icon: "◍" },
  { label: "Invoices",   href: "/invoices",                icon: "◐" },
  { label: "Schedule",   href: "/schedule",                icon: "◕" },
  { label: "Reports",    href: "/reports",                 icon: "◑" },
  { label: "Settings",   href: "/settings",                icon: "⚙" },
];

const QUICK_ACTIONS = [
  { label: "New Quote", href: "/quotes" },
  { label: "Schedule Job", href: "/schedule" },
  { label: "Assign Employee", href: "/employees" },
  { label: "Review Mileage", href: "/reports" },
  { label: "Generate Report", href: "/reports" },
  { label: "Send Invoice", href: "/invoices" },
];

function isoDateValue(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .split("T")[0];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function clampScore(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function safeRatio(numerator: number, denominator: number) {
  if (denominator <= 0) return 100;
  return (numerator / denominator) * 100;
}

function scoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Needs Attention";
  return "Critical";
}

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").trim().toLowerCase();
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [dashboard, setDashboard] = useState<DashboardState>({
    loading: true,
    metrics: {
      employeesWorking: 0,
      employeesDriving: 0,
      lateEmployees: 0,
      jobsScheduledToday: 0,
      jobsInProgress: 0,
      jobsCompletedToday: 0,
      revenueToday: 0,
      pendingMileageApprovals: 0,
      outstandingInvoices: 0,
    },
    healthScore: 0,
    healthLabel: "Critical",
    healthBreakdown: {
      onTimeArrivals: 0,
      completedJobs: 0,
      photoCompliance: 0,
      signatureCompliance: 0,
      mileageApprovals: 0,
      invoiceHealth: 0,
    },
    alerts: [],
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        await supabase.rpc("sync_late_employee_alerts");

        const [
          employeesResponse,
          openTimeEntriesResponse,
          jobsResponse,
          invoicesResponse,
          mileageResponse,
          photosResponse,
          lateAlertsResponse,
        ] = await Promise.all([
          supabase
            .from("employees")
            .select("id", { count: "exact", head: false })
            .eq("is_active", true),
          supabase
            .from("time_entries")
            .select("id,employee_id,job_id,clock_out_time")
            .is("clock_out_time", null),
          supabase
            .from("jobs")
            .select("id,customer_id,scheduled_date,scheduled_start_time,status,started_at,completed_at,signature_url,signature_status,assigned_employee_id,estimated_value")
            .order("scheduled_date", { ascending: false })
            .limit(500),
          supabase
            .from("invoices")
            .select("id,amount,status,due_date,created_at,payment_date")
            .order("created_at", { ascending: false })
            .limit(500),
          supabase
            .from("mileage_requests")
            .select("id,status")
            .order("created_at", { ascending: false })
            .limit(500),
          supabase
            .from("job_photos")
            .select("id,job_id,photo_type")
            .order("created_at", { ascending: false })
            .limit(1000),
          supabase
            .from("late_employee_alerts")
            .select("id,employee_id,employee_name,customer_name,minutes_late,status")
            .neq("status", "resolved")
            .order("minutes_late", { ascending: false })
            .limit(100),
        ]);

        const employeesCount = employeesResponse.count ?? 0;
        const openTimeEntries = (openTimeEntriesResponse.data ?? []) as TimeEntryRecord[];
        const jobs = (jobsResponse.data ?? []) as JobRecord[];
        const invoices = (invoicesResponse.data ?? []) as InvoiceRecord[];
        const mileageRequests = (mileageResponse.data ?? []) as MileageRequestRecord[];
        const photos = (photosResponse.data ?? []) as JobPhotoRecord[];
        const lateAlerts = (lateAlertsResponse.data ?? []) as LateAlertRecord[];

        const today = isoDateValue();
        const openDrivingEmployees = new Set(
          openTimeEntries.filter((entry) => !entry.job_id).map((entry) => entry.employee_id),
        );
        const openWorkingEmployees = new Set(
          openTimeEntries.filter((entry) => !!entry.job_id).map((entry) => entry.employee_id),
        );

        const jobsToday = jobs.filter((job) => job.scheduled_date === today);
        const inProgressJobs = jobs.filter((job) => normalizeStatus(job.status) === "in progress");
        const completedTodayJobs = jobs.filter((job) => {
          if (job.completed_at) {
            return job.completed_at.startsWith(today);
          }
          return normalizeStatus(job.status) === "completed" && job.scheduled_date === today;
        });

        const paidTodayRevenue = invoices.reduce((sum, invoice) => {
          if (normalizeStatus(invoice.status) !== "paid") return sum;
          const paidDate = invoice.payment_date ? invoice.payment_date.slice(0, 10) : invoice.created_at.slice(0, 10);
          if (paidDate !== today) return sum;
          return sum + Number(invoice.amount ?? 0);
        }, 0);

        const pendingMileageApprovals = mileageRequests.filter(
          (request) => normalizeStatus(request.status) === "pending",
        ).length;

        const outstandingInvoices = invoices.filter(
          (invoice) => normalizeStatus(invoice.status) !== "paid",
        ).length;

        const beforePhotoJobs = new Set(
          photos
            .filter((photo) => normalizeStatus(photo.photo_type) === "before")
            .map((photo) => photo.job_id),
        );
        const afterPhotoJobs = new Set(
          photos
            .filter((photo) => normalizeStatus(photo.photo_type) === "after")
            .map((photo) => photo.job_id),
        );

        const jobsNeedingBeforePhoto = jobs.filter(
          (job) => !!job.started_at || normalizeStatus(job.status) === "in progress" || normalizeStatus(job.status) === "completed",
        );
        const missingBeforePhotosCount = jobsNeedingBeforePhoto.filter(
          (job) => !beforePhotoJobs.has(job.id),
        ).length;

        const missingAfterPhotosCount = completedTodayJobs.filter(
          (job) => !afterPhotoJobs.has(job.id),
        ).length;

        const missingSignaturesCount = completedTodayJobs.filter((job) => {
          const signatureStatus = normalizeStatus(job.signature_status);
          return signatureStatus !== "signed" && !job.signature_url;
        }).length;

        const customerUnavailableCount = jobsToday.filter(
          (job) => normalizeStatus(job.signature_status) === "unavailable",
        ).length;

        const overdueInvoicesCount = invoices.filter((invoice) => {
          const status = normalizeStatus(invoice.status);
          return status !== "paid" && invoice.due_date < today;
        }).length;

        const lateEmployees = new Set(lateAlerts.map((alert) => alert.employee_id));

        const onTimeArrivalsScore = clampScore(
          safeRatio(Math.max(0, jobsToday.length - lateAlerts.length), jobsToday.length),
        );
        const completedJobsScore = clampScore(
          safeRatio(completedTodayJobs.length, jobsToday.length),
        );

        const totalRequiredPhotos = completedTodayJobs.length * 2;
        const capturedRequiredPhotos = completedTodayJobs.reduce((count, job) => {
          const hasBefore = beforePhotoJobs.has(job.id) ? 1 : 0;
          const hasAfter = afterPhotoJobs.has(job.id) ? 1 : 0;
          return count + hasBefore + hasAfter;
        }, 0);
        const photoComplianceScore = clampScore(safeRatio(capturedRequiredPhotos, totalRequiredPhotos));

        const signedCompletedJobs = completedTodayJobs.filter((job) => {
          const signatureStatus = normalizeStatus(job.signature_status);
          return signatureStatus === "signed" || !!job.signature_url;
        }).length;
        const signatureComplianceScore = clampScore(
          safeRatio(signedCompletedJobs, completedTodayJobs.length),
        );

        const approvedMileage = mileageRequests.filter(
          (request) => normalizeStatus(request.status) === "approved",
        ).length;
        const mileageApprovalsScore = clampScore(
          safeRatio(approvedMileage, mileageRequests.length),
        );

        const paidInvoices = invoices.filter((invoice) => normalizeStatus(invoice.status) === "paid").length;
        const invoiceHealthScore = clampScore(safeRatio(paidInvoices, invoices.length));

        const healthBreakdown: HealthBreakdown = {
          onTimeArrivals: onTimeArrivalsScore,
          completedJobs: completedJobsScore,
          photoCompliance: photoComplianceScore,
          signatureCompliance: signatureComplianceScore,
          mileageApprovals: mileageApprovalsScore,
          invoiceHealth: invoiceHealthScore,
        };

        const healthScore = clampScore(
          (healthBreakdown.onTimeArrivals +
            healthBreakdown.completedJobs +
            healthBreakdown.photoCompliance +
            healthBreakdown.signatureCompliance +
            healthBreakdown.mileageApprovals +
            healthBreakdown.invoiceHealth) / 6,
        );

        const alerts: AiAlert[] = [
          {
            id: "late-employees",
            title: "Late employees",
            description: "Assigned employees have not clocked in within the grace window.",
            count: lateAlerts.length,
            severity: "high",
            href: "/schedule",
          },
          {
            id: "missing-before",
            title: "Missing before photos",
            description: "Jobs in motion are missing required pre-service photos.",
            count: missingBeforePhotosCount,
            severity: "medium",
            href: "/jobs",
          },
          {
            id: "missing-after",
            title: "Missing after photos",
            description: "Completed jobs today are missing after photos.",
            count: missingAfterPhotosCount,
            severity: "medium",
            href: "/jobs",
          },
          {
            id: "missing-signatures",
            title: "Missing signatures",
            description: "Completed jobs today still need customer signature verification.",
            count: missingSignaturesCount,
            severity: "high",
            href: "/jobs",
          },
          {
            id: "customer-unavailable",
            title: "Customer unavailable",
            description: "Jobs marked unavailable may require follow-up communication.",
            count: customerUnavailableCount,
            severity: "low",
            href: "/jobs",
          },
          {
            id: "mileage-awaiting",
            title: "Mileage awaiting approval",
            description: "Mileage requests are pending supervisor review.",
            count: pendingMileageApprovals,
            severity: "medium",
            href: "/reports",
          },
          {
            id: "overdue-invoices",
            title: "Overdue invoices",
            description: "Open invoices are past due and need collection actions.",
            count: overdueInvoicesCount,
            severity: "high",
            href: "/invoices",
          },
        ];

        setDashboard({
          loading: false,
          metrics: {
            employeesWorking: openWorkingEmployees.size,
            employeesDriving: openDrivingEmployees.size,
            lateEmployees: lateEmployees.size,
            jobsScheduledToday: jobsToday.length,
            jobsInProgress: inProgressJobs.length,
            jobsCompletedToday: completedTodayJobs.length,
            revenueToday: paidTodayRevenue,
            pendingMileageApprovals,
            outstandingInvoices,
          },
          healthScore,
          healthLabel: scoreLabel(healthScore),
          healthBreakdown,
          alerts,
        });
      } catch (error) {
        console.error("Failed to load supervisor dashboard:", error);
        setDashboard((previous) => ({
          ...previous,
          loading: false,
        }));
      }
    };

    loadDashboard();

    const refreshInterval = setInterval(() => {
      void loadDashboard();
    }, 60_000);

    return () => clearInterval(refreshInterval);
  }, [supabase]);

  const cards: MetricCard[] = [
    { label: "Employees Working", value: dashboard.metrics.employeesWorking.toString(), tone: "text-cyan-700" },
    { label: "Employees Driving", value: dashboard.metrics.employeesDriving.toString(), tone: "text-sky-700" },
    { label: "Late Employees", value: dashboard.metrics.lateEmployees.toString(), tone: "text-rose-700" },
    { label: "Jobs Scheduled Today", value: dashboard.metrics.jobsScheduledToday.toString(), tone: "text-slate-800" },
    { label: "Jobs In Progress", value: dashboard.metrics.jobsInProgress.toString(), tone: "text-teal-700" },
    { label: "Jobs Completed Today", value: dashboard.metrics.jobsCompletedToday.toString(), tone: "text-emerald-700" },
    { label: "Revenue Today", value: formatCurrency(dashboard.metrics.revenueToday), tone: "text-emerald-700" },
    { label: "Pending Mileage Approvals", value: dashboard.metrics.pendingMileageApprovals.toString(), tone: "text-amber-700" },
    { label: "Outstanding Invoices", value: dashboard.metrics.outstandingInvoices.toString(), tone: "text-orange-700" },
  ];

  const highPriorityAlerts = dashboard.alerts.filter((alert) => alert.severity === "high" && alert.count > 0).length;
  const totalOpenAlerts = dashboard.alerts.reduce((sum, alert) => sum + alert.count, 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e8f5ff_0%,#f8fbff_55%,#f5f8ff_100%)] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200/80 bg-white/80 px-5 py-6 backdrop-blur lg:w-64 lg:border-b-0 lg:border-r lg:px-6">
          <ServiceFlowBrand subtitle="ServiceOS" />

          <nav className="mt-8 space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  item.active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-sm font-medium text-sky-700">Welcome header</p>
              <h1 className="text-2xl font-semibold text-slate-900">ServiceOS AI Supervisor Dashboard v1</h1>
              <p className="mt-1 text-sm text-slate-600">Operate with Confidence.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-700">
                  AI
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Supervisor Agent</p>
                  <p className="text-xs text-slate-500">Live operational analysis</p>
                </div>
              </div>
            </div>
          </header>

          <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">AI Supervisor Summary Card</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  {dashboard.loading ? "Calculating live operations..." : `${totalOpenAlerts} active alerts across field operations`}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {dashboard.loading
                    ? "Syncing jobs, teams, photo workflow, mileage, and invoice signals from Supabase."
                    : `${highPriorityAlerts} high-priority risks detected. Business Health is ${dashboard.healthScore}/100 (${dashboard.healthLabel}).`}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-slate-100">
                Live data refreshes every 60 seconds
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className={`mt-2 text-3xl font-semibold ${item.tone}`}>
                  {item.value}
                </p>
                {dashboard.loading ? <p className="mt-2 text-sm text-slate-400">Loading...</p> : null}
              </div>
            ))}
          </section>

          <section className="mt-6 rounded-3xl border border-rose-200/70 bg-white/95 p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-rose-600">AI Alerts</p>
                <h3 className="text-lg font-semibold text-slate-900">Rule-based operational alerts</h3>
                <p className="mt-1 text-sm text-slate-500">Generated from live jobs, photos, signatures, mileage, and invoices.</p>
              </div>
              <div className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
                {dashboard.alerts.filter((alert) => alert.count > 0).length} active categories
              </div>
            </div>

            {dashboard.loading ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading AI alerts...</div>
            ) : dashboard.alerts.every((alert) => alert.count === 0) ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No active alerts right now. Operations are currently stable.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {dashboard.alerts
                  .filter((alert) => alert.count > 0)
                  .map((alert) => (
                    <Link
                      key={alert.id}
                      href={alert.href}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                            alert.severity === "high"
                              ? "bg-rose-100 text-rose-700"
                              : alert.severity === "medium"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className="mt-3 text-3xl font-semibold text-slate-900">{alert.count}</p>
                    </Link>
                  ))}
              </div>
            )}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-emerald-200/70 bg-white/95 p-6 shadow-sm">
              <p className="text-sm font-medium text-emerald-700">Business Health</p>
              <div className="mt-2 flex items-end gap-2">
                <p className="text-4xl font-semibold text-slate-900">{dashboard.healthScore}/100</p>
                <p className="pb-1 text-sm font-semibold text-slate-600">{dashboard.healthLabel}</p>
              </div>

              <div className="mt-5 space-y-4">
                {[
                  ["On-time arrivals", dashboard.healthBreakdown.onTimeArrivals],
                  ["Completed jobs", dashboard.healthBreakdown.completedJobs],
                  ["Photo compliance", dashboard.healthBreakdown.photoCompliance],
                  ["Signature compliance", dashboard.healthBreakdown.signatureCompliance],
                  ["Mileage approvals", dashboard.healthBreakdown.mileageApprovals],
                  ["Invoice health", dashboard.healthBreakdown.invoiceHealth],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-semibold text-slate-900">{value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
              <p className="mt-1 text-sm text-slate-500">Jump to the next best operational task.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 text-sm text-slate-600 shadow-sm">
            <p>
              Employees tracked today: <span className="font-semibold text-slate-900">{dashboard.loading ? "..." : dashboard.metrics.employeesWorking + dashboard.metrics.employeesDriving}</span>
              {" · "}
              Live employee records: <span className="font-semibold text-slate-900">{dashboard.loading ? "..." : employeesCountForFooter(cards, dashboard.metrics)}</span>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

function employeesCountForFooter(_cards: MetricCard[], metrics: DashboardState["metrics"]) {
  return metrics.employeesWorking + metrics.employeesDriving;
}
