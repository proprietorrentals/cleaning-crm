"use client";

import { createClient } from "@/lib/supabase/client";
import { ServiceOSBrand } from "@/components/serviceos-brand";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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

type CustomerRecord = {
  id: string;
  created_at: string;
};

type AiAlert = {
  id: string;
  title: string;
  description: string;
  count: number;
  severity: "high" | "medium" | "low";
  href: string;
};

type RecommendationCard = {
  title: string;
  detail: string;
  href: string;
  priority: "high" | "medium" | "low";
};

type ForecastCard = {
  label: string;
  value: string;
  detail: string;
  tone: string;
};

type HealthSlice = {
  label: string;
  score: number;
  tone: string;
};

type HealthBreakdown = {
  onTimeArrivals: number;
  completedJobs: number;
  photoCompliance: number;
  signatureCompliance: number;
  mileageApprovals: number;
  invoiceHealth: number;
};

type TrendPoint = {
  label: string;
  value: number;
};

type KPIItem = {
  label: string;
  value: number;
  tone: string;
  format: "currency" | "percent" | "number";
};

type DashboardState = {
  loading: boolean;
  operatorName: string;
  metrics: {
    employeesWorking: number;
    employeesDriving: number;
    lateEmployees: number;
    jobsScheduledToday: number;
    jobsInProgress: number;
    jobsCompletedToday: number;
    revenueToday: number;
    revenueWeek: number;
    revenueMonth: number;
    jobsWeek: number;
    jobsMonth: number;
    completionRate: number;
    avgInvoice: number;
    employeeProductivity: number;
    pendingMileageApprovals: number;
    outstandingInvoices: number;
    activeEmployees: number;
  };
  healthScore: number;
  healthLabel: string;
  healthBreakdown: HealthBreakdown;
  alerts: AiAlert[];
  recommendations: RecommendationCard[];
  dailyBrief: {
    greeting: string;
    lines: string[];
    recommendation: string;
  };
  forecasts: ForecastCard[];
  healthSlices: HealthSlice[];
  trends: {
    revenue: TrendPoint[];
    jobs: TrendPoint[];
    customers: TrendPoint[];
    health: TrendPoint[];
  };
};

const navigationItems = [
  { label: "Dashboard", href: "/", active: true, icon: "▣" },
  { label: "Customers", href: "/customers", icon: "◫" },
  { label: "Quotes", href: "/quotes", icon: "◧" },
  { label: "Jobs", href: "/jobs", icon: "◔" },
  { label: "Employees", href: "/employees", icon: "◍" },
  { label: "Invoices", href: "/invoices", icon: "◐" },
  { label: "Schedule", href: "/schedule", icon: "◕" },
  { label: "Website Builder", href: "/website-builder", icon: "✦" },
  { label: "Operations Center", href: "/operations-center", icon: "◉" },
  { label: "Tasks", href: "/tasks", icon: "☑" },
  { label: "Reports", href: "/reports", icon: "◑" },
  { label: "Settings", href: "/settings", icon: "⚙" },
];

const QUICK_ACTIONS = [
  { label: "New Quote", href: "/quotes" },
  { label: "Schedule Job", href: "/schedule" },
  { label: "Assign Employee", href: "/employees" },
  { label: "Review Mileage", href: "/reports" },
  { label: "Generate Report", href: "/reports" },
  { label: "Send Invoice", href: "/invoices" },
];

const RANGE_DAYS = 7;

function isoDateValue(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .split("T")[0];
}

function addDays(base: Date, days: number) {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatShortDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map((part) => Number(part));
  const dt = new Date(year, month - 1, day);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function priorityWeight(priority: RecommendationCard["priority"]) {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function dashboardMetricsProductivityLabel(completedJobs: number, activeEmployees: number) {
  if (activeEmployees <= 0) return "0.0";
  return (completedJobs / activeEmployees).toFixed(1);
}

function missingSignatureCountCards(count: number, job: JobRecord | undefined): RecommendationCard[] {
  if (count <= 0) return [];
  return [
    {
      title: "Resolve missing signatures",
      detail: job
        ? `${count} job${count === 1 ? "" : "s"} still need a signature before invoicing.`
        : `${count} completed job${count === 1 ? "" : "s"} still need signature capture before invoicing.`,
      href: "/jobs",
      priority: "high",
    },
  ];
}

function missingPhotoCountCards(beforeCount: number, afterCount: number): RecommendationCard[] {
  const cards: RecommendationCard[] = [];
  const totalMissing = beforeCount + afterCount;
  if (beforeCount > 0) {
    cards.push({
      title: "Capture missing before photos",
      detail: `${beforeCount} job${beforeCount === 1 ? "" : "s"} are missing required pre-service photos.`,
      href: "/jobs",
      priority: "medium",
    });
  }
  if (afterCount > 0) {
    cards.push({
      title: "Capture missing after photos",
      detail: `${afterCount} completed job${afterCount === 1 ? "" : "s"} still need post-service photos.`,
      href: "/jobs",
      priority: "medium",
    });
  }
  if (totalMissing === 0) return [];
  return cards;
}

function overdueInvoiceCountCards(count: number): RecommendationCard[] {
  if (count <= 0) return [];
  return [
    {
      title: "Collect overdue invoices",
      detail: `${count} open invoice${count === 1 ? " is" : "s are"} past due and ready for follow-up.`,
      href: "/invoices",
      priority: "high",
    },
  ];
}

function lateEmployeeCountCards(count: number): RecommendationCard[] {
  if (count <= 0) return [];
  return [
    {
      title: "Review late employee schedule",
      detail: `${count} employee${count === 1 ? "" : "s"} are flagged in the current late alert queue.`,
      href: "/schedule",
      priority: "medium",
    },
  ];
}

function mileageApprovalCountCards(count: number): RecommendationCard[] {
  if (count <= 0) return [];
  return [
    {
      title: "Approve mileage requests",
      detail: `${count} mileage request${count === 1 ? "" : "s"} are waiting for supervisor review.`,
      href: "/reports",
      priority: "medium",
    },
  ];
}

function customerFollowUpCountCards(count: number, hint: string): RecommendationCard[] {
  if (count <= 0 && !hint) return [];
  return [
    {
      title: "Follow up on customer activity",
      detail: count > 0 ? `${count} customer${count === 1 ? "" : "s"} may need follow-up communication.` : hint,
      href: "/customers",
      priority: "low",
    },
  ];
}

function topPerformerCards(topEmployeeJobs: number, previousWeekRevenue: number, projectedIncrease: number): RecommendationCard[] {
  const cards: RecommendationCard[] = [];
  if (topEmployeeJobs > 0) {
    cards.push({
      title: "Celebrate top-performing employee",
      detail: `One employee completed ${topEmployeeJobs} job${topEmployeeJobs === 1 ? "" : "s"} this month with strong consistency.`,
      href: "/employees",
      priority: "low",
    });
  }
  if (previousWeekRevenue > 0) {
    cards.push({
      title: "Review revenue trend",
      detail: `Revenue is projected to ${projectedIncrease >= 0 ? "exceed" : "trail"} last week by ${Math.abs(projectedIncrease)}%.`,
      href: "/reports",
      priority: projectedIncrease >= 0 ? "low" : "medium",
    });
  }
  return cards;
}

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").trim().toLowerCase();
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function getDateKeys(days: number) {
  const end = new Date();
  const start = addDays(end, -(days - 1));

  const keys: string[] = [];
  for (let index = 0; index < days; index += 1) {
    const d = addDays(start, index);
    keys.push(isoDateValue(d));
  }
  return keys;
}

function sumInPeriod(entries: InvoiceRecord[], fromDate: string) {
  return entries.reduce((sum, invoice) => {
    if (normalizeStatus(invoice.status) !== "paid") return sum;
    const paidDate = invoice.payment_date ? invoice.payment_date.slice(0, 10) : invoice.created_at.slice(0, 10);
    if (paidDate < fromDate) return sum;
    return sum + Number(invoice.amount ?? 0);
  }, 0);
}

function buildTrendSeries(
  dateKeys: string[],
  invoices: InvoiceRecord[],
  jobs: JobRecord[],
  customers: CustomerRecord[],
  healthToday: number,
) {
  const revenueByDate = new Map<string, number>();
  const jobsCompletedByDate = new Map<string, number>();
  const customersByDate = new Map<string, number>();

  for (const key of dateKeys) {
    revenueByDate.set(key, 0);
    jobsCompletedByDate.set(key, 0);
    customersByDate.set(key, 0);
  }

  for (const invoice of invoices) {
    if (normalizeStatus(invoice.status) !== "paid") continue;
    const paidDate = invoice.payment_date ? invoice.payment_date.slice(0, 10) : invoice.created_at.slice(0, 10);
    if (!revenueByDate.has(paidDate)) continue;
    const current = revenueByDate.get(paidDate) ?? 0;
    revenueByDate.set(paidDate, current + Number(invoice.amount ?? 0));
  }

  for (const job of jobs) {
    const isCompleted = normalizeStatus(job.status) === "completed" || !!job.completed_at;
    if (!isCompleted) continue;
    const dateKey = job.completed_at ? job.completed_at.slice(0, 10) : job.scheduled_date;
    if (!jobsCompletedByDate.has(dateKey)) continue;
    jobsCompletedByDate.set(dateKey, (jobsCompletedByDate.get(dateKey) ?? 0) + 1);
  }

  for (const customer of customers) {
    const createdDate = customer.created_at.slice(0, 10);
    if (!customersByDate.has(createdDate)) continue;
    customersByDate.set(createdDate, (customersByDate.get(createdDate) ?? 0) + 1);
  }

  let cumulativeCustomers = 0;
  const customerTrend = dateKeys.map((dateKey) => {
    cumulativeCustomers += customersByDate.get(dateKey) ?? 0;
    return { label: formatShortDate(dateKey), value: cumulativeCustomers };
  });

  const revenueTrend = dateKeys.map((dateKey) => ({
    label: formatShortDate(dateKey),
    value: revenueByDate.get(dateKey) ?? 0,
  }));

  const jobsTrend = dateKeys.map((dateKey) => ({
    label: formatShortDate(dateKey),
    value: jobsCompletedByDate.get(dateKey) ?? 0,
  }));

  const healthTrend = dateKeys.map((dateKey, index) => {
    const rev = revenueTrend[index]?.value ?? 0;
    const jobsCount = jobsTrend[index]?.value ?? 0;
    const trendSignal = clampScore(55 + Math.min(30, jobsCount * 4) + Math.min(15, Math.round(rev / 400)));
    const blended = clampScore((trendSignal + healthToday) / 2);
    return { label: formatShortDate(dateKey), value: blended };
  });

  return {
    revenue: revenueTrend,
    jobs: jobsTrend,
    customers: customerTrend,
    health: healthTrend,
  };
}

function useAnimatedNumber(value: number, durationMs = 900) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = display;

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (value - from) * eased;
      setDisplay(next);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return display;
}

function AnimatedMetricValue({
  value,
  format,
}: {
  value: number;
  format: "currency" | "percent" | "number";
}) {
  const animated = useAnimatedNumber(value);

  if (format === "currency") {
    return <>{formatCurrency(animated)}</>;
  }

  if (format === "percent") {
    return <>{Math.round(animated)}%</>;
  }

  return <>{Math.round(animated).toLocaleString()}</>;
}

function BusinessHealthGauge({ score, label }: { score: number; label: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = clampScore(score) / 100;
  const dashOffset = circumference * (1 - progress);
  const animatedScore = useAnimatedNumber(score);

  const gaugeColor = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx="70" cy="70" r={radius} stroke="#e2e8f0" strokeWidth="12" fill="none" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke={gaugeColor}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 950ms ease, stroke 450ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-semibold text-slate-900">{Math.round(animatedScore)}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">/ 100</p>
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-700">{label}</p>
      <p className="text-xs text-slate-500">Green / Yellow / Red risk signal</p>
    </div>
  );
}

function TrendSparkline({
  points,
  color,
  format,
}: {
  points: TrendPoint[];
  color: string;
  format: "currency" | "number" | "percent";
}) {
  const [ready, setReady] = useState(false);
  const polylineRef = useRef<SVGPolylineElement | null>(null);
  const [pathLength, setPathLength] = useState(120);

  useEffect(() => {
    setReady(false);
    const timeout = setTimeout(() => {
      if (polylineRef.current) {
        setPathLength(polylineRef.current.getTotalLength());
      }
      setReady(true);
    }, 40);

    return () => clearTimeout(timeout);
  }, [points]);

  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const coordinates = points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 100;
      const y = 100 - ((point.value - min) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  const latest = points[points.length - 1]?.value ?? 0;
  const latestText =
    format === "currency"
      ? formatCurrency(latest)
      : format === "percent"
        ? `${Math.round(latest)}%`
        : Math.round(latest).toLocaleString();

  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <p className="text-xs text-slate-500">Last 7 days</p>
        <p className="text-sm font-semibold text-slate-900">{latestText}</p>
      </div>
      <svg viewBox="0 0 100 100" className="h-28 w-full rounded-xl bg-slate-50 p-2">
        <polyline fill="none" stroke="#e2e8f0" strokeWidth="1" points="0,88 100,88" />
        <polyline
          ref={polylineRef}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={coordinates}
          style={{
            strokeDasharray: pathLength,
            strokeDashoffset: ready ? 0 : pathLength,
            transition: "stroke-dashoffset 900ms ease",
          }}
        />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
        <span>{points[0]?.label ?? ""}</span>
        <span>{points[points.length - 1]?.label ?? ""}</span>
      </div>
    </div>
  );
}

export function AdminDashboardHome() {
  const supabase = useMemo(() => createClient(), []);
  const [dashboard, setDashboard] = useState<DashboardState>({
    loading: true,
    operatorName: "Operator",
    metrics: {
      employeesWorking: 0,
      employeesDriving: 0,
      lateEmployees: 0,
      jobsScheduledToday: 0,
      jobsInProgress: 0,
      jobsCompletedToday: 0,
      revenueToday: 0,
      revenueWeek: 0,
      revenueMonth: 0,
      jobsWeek: 0,
      jobsMonth: 0,
      completionRate: 0,
      avgInvoice: 0,
      employeeProductivity: 0,
      pendingMileageApprovals: 0,
      outstandingInvoices: 0,
      activeEmployees: 0,
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
    recommendations: [],
    forecasts: [],
    healthSlices: [],
    dailyBrief: {
      greeting: "Good Evening, Operator.",
      lines: [],
      recommendation: "Review operations before invoicing.",
    },
    trends: {
      revenue: [],
      jobs: [],
      customers: [],
      health: [],
    },
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        await supabase.rpc("sync_late_employee_alerts");

        const now = new Date();
        const today = isoDateValue(now);
        const weekStart = isoDateValue(addDays(now, -6));
        const monthStart = isoDateValue(addDays(now, -29));
        const dateKeys = getDateKeys(RANGE_DAYS);

        const [
          authResponse,
          employeesResponse,
          openTimeEntriesResponse,
          jobsResponse,
          invoicesResponse,
          mileageResponse,
          photosResponse,
          lateAlertsResponse,
          customersResponse,
        ] = await Promise.all([
          supabase.auth.getUser(),
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
            .limit(800),
          supabase
            .from("invoices")
            .select("id,amount,status,due_date,created_at,payment_date")
            .order("created_at", { ascending: false })
            .limit(800),
          supabase
            .from("mileage_requests")
            .select("id,status")
            .order("created_at", { ascending: false })
            .limit(500),
          supabase
            .from("job_photos")
            .select("id,job_id,photo_type")
            .order("created_at", { ascending: false })
            .limit(1400),
          supabase
            .from("late_employee_alerts")
            .select("id,employee_id,employee_name,customer_name,minutes_late,status")
            .neq("status", "resolved")
            .order("minutes_late", { ascending: false })
            .limit(200),
          supabase.from("customers").select("id,created_at").order("created_at", { ascending: false }).limit(800),
        ]);

        const user = authResponse.data.user;
        const operatorName =
          (user?.user_metadata?.first_name as string | undefined) ||
          (user?.user_metadata?.name as string | undefined) ||
          "Operator";

        const activeEmployees = employeesResponse.count ?? 0;
        const openTimeEntries = (openTimeEntriesResponse.data ?? []) as TimeEntryRecord[];
        const jobs = (jobsResponse.data ?? []) as JobRecord[];
        const invoices = (invoicesResponse.data ?? []) as InvoiceRecord[];
        const mileageRequests = (mileageResponse.data ?? []) as MileageRequestRecord[];
        const photos = (photosResponse.data ?? []) as JobPhotoRecord[];
        const lateAlerts = (lateAlertsResponse.data ?? []) as LateAlertRecord[];
        const customers = (customersResponse.data ?? []) as CustomerRecord[];

        const openDrivingEmployees = new Set(
          openTimeEntries.filter((entry) => !entry.job_id).map((entry) => entry.employee_id),
        );
        const openWorkingEmployees = new Set(
          openTimeEntries.filter((entry) => !!entry.job_id).map((entry) => entry.employee_id),
        );

        const jobsToday = jobs.filter((job) => job.scheduled_date === today);
        const jobsThisWeek = jobs.filter((job) => job.scheduled_date >= weekStart);
        const jobsThisMonth = jobs.filter((job) => job.scheduled_date >= monthStart);
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

        const paidInvoices = invoices.filter((invoice) => normalizeStatus(invoice.status) === "paid");

        const revenueWeek = sumInPeriod(invoices, weekStart);
        const revenueMonth = sumInPeriod(invoices, monthStart);

        const avgInvoice = paidInvoices.length
          ? paidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0) / paidInvoices.length
          : 0;

        const completionRate = clampScore(safeRatio(completedTodayJobs.length, jobsToday.length));
        const employeeProductivity = activeEmployees ? completedTodayJobs.length / activeEmployees : 0;

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
          (job) =>
            !!job.started_at ||
            normalizeStatus(job.status) === "in progress" ||
            normalizeStatus(job.status) === "completed",
        );
        const missingBeforePhotosCount = jobsNeedingBeforePhoto.filter((job) => !beforePhotoJobs.has(job.id)).length;

        const missingAfterPhotosCount = completedTodayJobs.filter((job) => !afterPhotoJobs.has(job.id)).length;

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
        const completedJobsScore = clampScore(safeRatio(completedTodayJobs.length, jobsToday.length));

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
        const signatureComplianceScore = clampScore(safeRatio(signedCompletedJobs, completedTodayJobs.length));

        const approvedMileage = mileageRequests.filter(
          (request) => normalizeStatus(request.status) === "approved",
        ).length;
        const mileageApprovalsScore = clampScore(safeRatio(approvedMileage, mileageRequests.length));

        const invoiceHealthScore = clampScore(safeRatio(paidInvoices.length, invoices.length));

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
            healthBreakdown.invoiceHealth) /
            6,
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

        const byEmployee = new Map<string, number>();
        for (const job of jobsThisMonth) {
          if (normalizeStatus(job.status) !== "completed") continue;
          if (!job.assigned_employee_id) continue;
          byEmployee.set(job.assigned_employee_id, (byEmployee.get(job.assigned_employee_id) ?? 0) + 1);
        }
        const topEmployeeJobs = Math.max(0, ...Array.from(byEmployee.values()));

        const previousWeekRevenue = invoices.reduce((sum, invoice) => {
          if (normalizeStatus(invoice.status) !== "paid") return sum;
          const paidDate = invoice.payment_date ? invoice.payment_date.slice(0, 10) : invoice.created_at.slice(0, 10);
          if (paidDate >= weekStart) return sum;
          const prevWeekStart = isoDateValue(addDays(now, -13));
          if (paidDate < prevWeekStart) return sum;
          return sum + Number(invoice.amount ?? 0);
        }, 0);

        const projectedIncrease = previousWeekRevenue
          ? Math.round(((revenueWeek - previousWeekRevenue) / previousWeekRevenue) * 100)
          : 0;

        const recentCustomerThreshold = isoDateValue(addDays(now, -43));
        const staleCustomerHint = customers.some((customer) => customer.created_at.slice(0, 10) < recentCustomerThreshold)
          ? "One commercial customer has not booked service in 43+ days."
          : "New customer bookings are staying active this cycle.";

        const missingSignatureJob = completedTodayJobs.find((job) => {
          const signatureStatus = normalizeStatus(job.signature_status);
          return signatureStatus !== "signed" && !job.signature_url;
        });

        const satisfactionLine =
          signatureComplianceScore >= 90 ? "Customer satisfaction remains excellent." : "Customer satisfaction needs follow-up on signature completion.";

        const revenueHealth = clampScore(safeRatio(revenueWeek, revenueMonth || revenueWeek || 1));
        const customerSatisfactionHealth = clampScore((onTimeArrivalsScore + signatureComplianceScore) / 2);
        const healthSlices: HealthSlice[] = [
          { label: "Revenue", score: revenueHealth, tone: "bg-blue-600" },
          { label: "Job Completion", score: completedJobsScore, tone: "bg-emerald-600" },
          { label: "Customer Satisfaction", score: customerSatisfactionHealth, tone: "bg-cyan-600" },
          { label: "Photo Compliance", score: photoComplianceScore, tone: "bg-violet-600" },
          { label: "Signature Compliance", score: signatureComplianceScore, tone: "bg-amber-600" },
          { label: "Invoice Collection", score: invoiceHealthScore, tone: "bg-rose-600" },
        ];

        const dailyBrief = {
          greeting: `${greetingForHour(now.getHours())}, ${operatorName}.`,
          lines: [
            `${completedTodayJobs.length} jobs completed`,
            `Revenue ${formatCurrency(paidTodayRevenue)}`,
            `${missingSignaturesCount} missing signature${missingSignaturesCount === 1 ? "" : "s"}`,
            `${missingBeforePhotosCount + missingAfterPhotosCount} missing photo${missingBeforePhotosCount + missingAfterPhotosCount === 1 ? "" : "s"}`,
            `${outstandingInvoices} invoice${outstandingInvoices === 1 ? "" : "s"} still unpaid`,
            `Employee productivity averages ${dashboardMetricsProductivityLabel(completedTodayJobs.length, activeEmployees)} jobs per employee.`,
            satisfactionLine,
          ],
          recommendation: missingSignatureJob
            ? `Review job #${missingSignatureJob.id.slice(0, 8)} before sending invoice.`
            : "Review overdue invoices and follow up with top-value customers.",
        };

        const recommendations: RecommendationCard[] = [
          ...(missingSignatureCountCards(missingSignaturesCount, missingSignatureJob)),
          ...(missingPhotoCountCards(missingBeforePhotosCount, missingAfterPhotosCount)),
          ...(overdueInvoiceCountCards(overdueInvoicesCount)),
          ...(lateEmployeeCountCards(lateAlerts.length)),
          ...(mileageApprovalCountCards(pendingMileageApprovals)),
          ...(customerFollowUpCountCards(customerUnavailableCount, staleCustomerHint)),
          ...(topPerformerCards(topEmployeeJobs, previousWeekRevenue, projectedIncrease)),
        ].sort((left, right) => priorityWeight(right.priority) - priorityWeight(left.priority));

        const forecasts: ForecastCard[] = [
          {
            label: "Expected Revenue Today",
            value: formatCurrency(Math.max(paidTodayRevenue, Math.round(revenueWeek / 7))),
            detail: "Placeholder forecast based on current weekly revenue patterns.",
            tone: "text-emerald-700",
          },
          {
            label: "Expected Jobs",
            value: Math.max(jobsToday.length, Math.round(jobsThisWeek.length / 7)).toString(),
            detail: "Placeholder forecast derived from current job cadence.",
            tone: "text-blue-700",
          },
          {
            label: "Completion Forecast",
            value: `${clampScore((completionRate + healthScore) / 2)}%`,
            detail: "Placeholder forecast blending live completion and health signals.",
            tone: "text-violet-700",
          },
        ];

        const trends = buildTrendSeries(dateKeys, invoices, jobs, customers, healthScore);

        setDashboard({
          loading: false,
          operatorName,
          metrics: {
            employeesWorking: openWorkingEmployees.size,
            employeesDriving: openDrivingEmployees.size,
            lateEmployees: lateEmployees.size,
            jobsScheduledToday: jobsToday.length,
            jobsInProgress: inProgressJobs.length,
            jobsCompletedToday: completedTodayJobs.length,
            revenueToday: paidTodayRevenue,
            revenueWeek,
            revenueMonth,
            jobsWeek: jobsThisWeek.length,
            jobsMonth: jobsThisMonth.length,
            completionRate,
            avgInvoice,
            employeeProductivity,
            pendingMileageApprovals,
            outstandingInvoices,
            activeEmployees,
          },
          healthScore,
          healthLabel: scoreLabel(healthScore),
          healthBreakdown,
          alerts,
          recommendations,
          forecasts,
          healthSlices,
          dailyBrief,
          trends,
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

  const kpis: KPIItem[] = [
    { label: "Today's Revenue", value: dashboard.metrics.revenueToday, tone: "text-emerald-700", format: "currency" },
    { label: "Weekly Revenue", value: dashboard.metrics.revenueWeek, tone: "text-blue-700", format: "currency" },
    { label: "Monthly Revenue", value: dashboard.metrics.revenueMonth, tone: "text-indigo-700", format: "currency" },
    { label: "Jobs Today", value: dashboard.metrics.jobsScheduledToday, tone: "text-slate-900", format: "number" },
    { label: "Jobs This Week", value: dashboard.metrics.jobsWeek, tone: "text-cyan-700", format: "number" },
    { label: "Jobs This Month", value: dashboard.metrics.jobsMonth, tone: "text-sky-700", format: "number" },
    { label: "Completion Rate", value: dashboard.metrics.completionRate, tone: "text-teal-700", format: "percent" },
    { label: "Average Invoice", value: dashboard.metrics.avgInvoice, tone: "text-amber-700", format: "currency" },
    {
      label: "Employee Productivity",
      value: Number((dashboard.metrics.employeeProductivity * 10).toFixed(1)),
      tone: "text-violet-700",
      format: "number",
    },
  ];

  const highPriorityAlerts = dashboard.alerts.filter((alert) => alert.severity === "high" && alert.count > 0).length;
  const totalOpenAlerts = dashboard.alerts.reduce((sum, alert) => sum + alert.count, 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e8f5ff_0%,#f8fbff_55%,#f5f8ff_100%)] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200/80 bg-white/80 px-5 py-6 backdrop-blur lg:w-64 lg:border-b-0 lg:border-r lg:px-6">
          <ServiceOSBrand />

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
              <p className="text-sm font-medium text-sky-700">AI Command Center</p>
              <h1 className="text-2xl font-semibold text-slate-900">Operate with Confidence.</h1>
              <p className="mt-1 text-sm text-slate-600">Live operational analysis, forecasting, and prioritized guidance.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-700">
                  AI
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Supervisor Agent</p>
                  <p className="text-xs text-slate-500">Refreshes every 60 seconds</p>
                </div>
              </div>
            </div>
          </header>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <article className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">AI Daily Brief</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{dashboard.dailyBrief.greeting}</h2>
              <p className="mt-1 text-sm text-slate-500">Today's Summary</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {dashboard.dailyBrief.lines.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="mt-1 text-blue-700">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-semibold">Recommended Action</p>
                <p className="mt-1">{dashboard.dailyBrief.recommendation}</p>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Business Health Gauge</p>
              <div className="mt-2 flex justify-center">
                <BusinessHealthGauge score={dashboard.healthScore} label={dashboard.healthLabel} />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {dashboard.loading
                  ? "Calculating live operations..."
                  : `${totalOpenAlerts} active alerts across field operations, with ${highPriorityAlerts} high-priority risks.`}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {dashboard.healthSlices.map((slice) => (
                  <div key={slice.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-700">{slice.label}</span>
                      <span className="font-semibold text-slate-900">{slice.score}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-200">
                      <div className={`h-2 rounded-full ${slice.tone}`} style={{ width: `${slice.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {dashboard.forecasts.map((forecast) => (
              <article
                key={forecast.label}
                className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm transition-all duration-500"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">Forecast</p>
                <p className={`mt-2 text-3xl font-semibold ${forecast.tone}`}>{forecast.value}</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{forecast.label}</p>
                <p className="mt-1 text-sm text-slate-600">{forecast.detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">KPI Cards</h3>
              <p className="text-xs uppercase tracking-wide text-slate-500">Animated live metrics</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {kpis.map((item, index) => (
                <article
                  key={item.label}
                  className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm opacity-100 transition duration-500"
                  style={{ transitionDelay: `${index * 60}ms` }}
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className={`mt-2 text-3xl font-semibold ${item.tone}`}>
                    <AnimatedMetricValue value={item.value} format={item.format} />
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-indigo-200/70 bg-white/95 p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">AI Recommendations</p>
                <h3 className="text-lg font-semibold text-slate-900">Prioritized action cards linked to relevant pages</h3>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {dashboard.recommendations.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 transition-all duration-500 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                        item.priority === "high"
                          ? "bg-rose-100 text-rose-700"
                          : item.priority === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-700">Revenue Trend</p>
              <TrendSparkline points={dashboard.trends.revenue} color="#2563eb" format="currency" />
            </article>
            <article className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-700">Completed Jobs Trend</p>
              <TrendSparkline points={dashboard.trends.jobs} color="#0f766e" format="number" />
            </article>
            <article className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-700">Customer Growth Trend</p>
              <TrendSparkline points={dashboard.trends.customers} color="#7c3aed" format="number" />
            </article>
            <article className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-700">Business Health Trend</p>
              <TrendSparkline points={dashboard.trends.health} color="#16a34a" format="percent" />
            </article>
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
                      <p className="mt-3 text-3xl font-semibold text-slate-900">
                        <AnimatedMetricValue value={alert.count} format="number" />
                      </p>
                    </Link>
                  ))}
              </div>
            )}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-emerald-200/70 bg-white/95 p-6 shadow-sm">
              <p className="text-sm font-medium text-emerald-700">Health Breakdown</p>
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
              Active employees: <span className="font-semibold text-slate-900">{dashboard.loading ? "..." : dashboard.metrics.activeEmployees}</span>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
