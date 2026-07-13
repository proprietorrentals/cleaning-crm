"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ServiceOSBrand } from "@/components/serviceos-brand";
import type { DemoData, DemoJob, DemoInvoice, DemoQuote, DemoMileageRequest, DemoRevenuePoint } from "@/lib/explore-demo-data";
import { useI18n } from "@/components/i18n-provider";

type TabId = "dashboard" | "customers" | "employees" | "jobs" | "quotes" | "invoices" | "reports";

type ExploreDemoShellProps = {
  data: DemoData;
};

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function SectionShell({ title, subtitle, children, readOnlyLabel }: { title: string; subtitle: string; children: React.ReactNode; readOnlyLabel: string }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">{readOnlyLabel}</p>
      </div>
      {children}
    </section>
  );
}

function RevenueBars({ data, locale }: { data: DemoRevenuePoint[]; locale: string }) {
  const max = Math.max(...data.map((entry) => entry.total), 1);

  return (
    <div className="flex h-44 items-end gap-2 sm:gap-3">
      {data.map((entry) => (
        <div key={entry.label} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-[10px] font-medium text-slate-500">{formatCurrency(entry.total, locale)}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-2xl bg-gradient-to-t from-sky-700 to-cyan-400"
              style={{ height: `${Math.max((entry.total / max) * 100, entry.total > 0 ? 6 : 2)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">{entry.label}</span>
        </div>
      ))}
    </div>
  );
}

function DemoPhotoGrid({ job, t }: { job: DemoJob; t: (key: string, vars?: Record<string, string | number>) => string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[job.before_photo_url, job.after_photo_url].filter(Boolean).map((photoUrl, index) => (
        <div key={`${job.id}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <img src={photoUrl ?? ""} alt={index === 0 ? t("public.exploreBeforePhotoAlt", { customer: job.customer_name }) : t("public.exploreAfterPhotoAlt", { customer: job.customer_name })} className="h-32 w-full object-cover" />
          <div className="px-3 py-2 text-xs font-medium text-slate-600">{index === 0 ? t("public.exploreBeforePhoto") : t("public.exploreAfterPhoto")}</div>
        </div>
      ))}
    </div>
  );
}

function DashboardTab({ data, locale, t }: { data: DemoData; locale: string; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const completedJobs = data.completedJobs.length;
  const scheduledJobs = data.scheduledJobs.length;
  const totalCustomers = data.customers.length;
  const totalEmployees = data.employees.length;
  const paidInvoices = data.invoices.filter((invoice) => invoice.status === "Paid").length;
  const totalRevenue = data.invoices.filter((invoice) => invoice.status === "Paid").reduce((sum, invoice) => sum + invoice.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("public.exploreCustomers")} value={new Intl.NumberFormat(locale).format(totalCustomers)} hint={t("public.exploreSeededDemoAccounts")} />
        <StatCard label={t("public.exploreEmployees")} value={new Intl.NumberFormat(locale).format(totalEmployees)} hint={t("public.exploreFieldOperationsStaff")} />
        <StatCard label={t("public.exploreCompletedJobs")} value={new Intl.NumberFormat(locale).format(completedJobs)} hint={t("public.exploreHistoricalServiceVisits")} />
        <StatCard label={t("public.exploreScheduledJobs")} value={new Intl.NumberFormat(locale).format(scheduledJobs)} hint={t("public.exploreUpcomingServiceVisits")} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <SectionShell title={t("public.exploreRevenueHistory")} subtitle={t("public.exploreRevenueHistorySubtitle")} readOnlyLabel={t("public.exploreReadOnlyDemo")}>
          <RevenueBars data={data.revenueHistory} locale={locale} />
        </SectionShell>

        <SectionShell title={t("public.exploreSupervisorSummary")} subtitle={t("public.exploreSupervisorSummarySubtitle")} readOnlyLabel={t("public.exploreReadOnlyDemo")}>
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">{t("public.exploreDemoCompany")}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(totalRevenue, locale)}</p>
              <p className="text-sm text-slate-500">{t("public.exploreCollectedRevenue")}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">{t("public.explorePaidInvoices")}</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-900">{new Intl.NumberFormat(locale).format(paidInvoices)}</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-700">{t("public.exploreCoverage")}</p>
                <p className="mt-2 text-2xl font-semibold text-sky-900">{Math.round((paidInvoices / data.invoices.length) * 100)}%</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">{t("public.exploreBrandPromise")}</p>
              <p className="mt-1 text-sm text-slate-500">{t("public.operateWithConfidence")}</p>
            </div>
          </div>
        </SectionShell>
      </div>
    </div>
  );
}

function CustomersTab({ data, t }: { data: DemoData; t: (key: string, vars?: Record<string, string | number>) => string }) {
  return (
    <SectionShell title={t("public.exploreCustomers")} subtitle={t("public.exploreCustomersSubtitle")} readOnlyLabel={t("public.exploreReadOnlyDemo")}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.customers.map((customer) => (
          <article key={customer.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-base font-semibold text-slate-900">{customer.company_name}</p>
            <p className="text-sm text-slate-600">{customer.contact_name}</p>
            <div className="mt-3 space-y-1 text-sm text-slate-500">
              <p>{customer.email}</p>
              <p>{customer.phone}</p>
              <p>{customer.cleaning_frequency} {t("public.exploreService")}</p>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

function EmployeesTab({ data, locale, t }: { data: DemoData; locale: string; t: (key: string, vars?: Record<string, string | number>) => string }) {
  return (
    <SectionShell title={t("public.exploreEmployees")} subtitle={t("public.exploreEmployeesSubtitle")} readOnlyLabel={t("public.exploreReadOnlyDemo")}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.employees.map((employee) => (
          <article key={employee.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">{employee.first_name} {employee.last_name}</p>
                <p className="text-sm text-slate-500">{employee.role} · {employee.department}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{employee.status === "active" ? t("public.exploreStatusActive") : employee.status === "on leave" ? t("public.exploreStatusOnLeave") : employee.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t("public.exploreActive")}</p>
                <p className="font-semibold text-slate-900">{new Intl.NumberFormat(locale).format(employee.active_jobs)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t("public.exploreCompleted")}</p>
                <p className="font-semibold text-slate-900">{new Intl.NumberFormat(locale).format(employee.completed_jobs)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t("public.exploreRating")}</p>
                <p className="font-semibold text-slate-900">{employee.rating}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

function JobsTab({ data, locale, t }: { data: DemoData; locale: string; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const featuredCompletedJobs = data.completedJobs.slice(0, 6);
  const featuredScheduledJobs = data.scheduledJobs.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("public.exploreCompleted")} value={new Intl.NumberFormat(locale).format(data.completedJobs.length)} hint={t("public.exploreBeforeAfterIncluded")} />
        <StatCard label={t("public.exploreScheduled")} value={new Intl.NumberFormat(locale).format(data.scheduledJobs.length)} hint={t("public.exploreFutureServiceCalendar")} />
        <StatCard label={t("public.exploreSigned")} value={new Intl.NumberFormat(locale).format(data.completedJobs.filter((job) => !!job.signature_url).length)} hint={t("public.exploreCustomerSignaturesCaptured")} />
        <StatCard label={t("public.exploreMileageRequests")} value={new Intl.NumberFormat(locale).format(data.mileageRequests.length)} hint={t("public.exploreIncludedInWorkflow")} />
      </div>

      <SectionShell title={t("public.exploreCompletedJobs")} subtitle={t("public.exploreCompletedJobsSubtitle")} readOnlyLabel={t("public.exploreReadOnlyDemo")}>
        <div className="grid gap-4 xl:grid-cols-2">
          {featuredCompletedJobs.map((job) => (
            <article key={job.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{job.customer_name}</p>
                  <p className="text-sm text-slate-500">{job.employee_name} · {formatDate(job.scheduled_date, locale)} · {job.scheduled_start_time}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{t("public.exploreCompleted")}</span>
              </div>
              <div className="mt-4"><DemoPhotoGrid job={job} t={t} /></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("public.exploreCustomerSignature")}</p>
                  <img src={job.signature_url ?? ""} alt={`Signature for ${job.customer_name}`} className="mt-2 h-20 w-full rounded-xl object-contain bg-white" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t("public.exploreAiJobReport")}</p>
                  <p className="mt-2 text-sm text-slate-700">{job.report_summary}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell title={t("public.exploreScheduledJobs")} subtitle={t("public.exploreScheduledJobsSubtitle")} readOnlyLabel={t("public.exploreReadOnlyDemo")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {featuredScheduledJobs.map((job) => (
            <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-semibold text-slate-900">{job.customer_name}</p>
              <p className="text-sm text-slate-500">{job.employee_name}</p>
              <p className="mt-2 text-sm text-slate-600">{formatDate(job.scheduled_date, locale)} · {job.scheduled_start_time}</p>
              <p className="mt-3 text-sm text-slate-500">{job.notes}</p>
            </article>
          ))}
        </div>
      </SectionShell>
    </div>
  );
}

function QuotesTab({ data, locale, t }: { data: DemoData; locale: string; t: (key: string, vars?: Record<string, string | number>) => string }) {
  return (
    <SectionShell title={t("public.navQuotes")} subtitle={t("public.exploreQuotesSubtitle")} readOnlyLabel={t("public.exploreReadOnlyDemo")}>
      <div className="grid gap-3 xl:grid-cols-2">
        {data.quotes.slice(0, 12).map((quote) => (
          <article key={quote.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{quote.customer_name}</p>
                <p className="text-sm text-slate-500">{new Intl.NumberFormat(locale).format(quote.square_footage)} {t("public.sqFt")} · {quote.cleaning_frequency}</p>
              </div>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{quote.status === "Approved" ? t("public.exploreStatusApproved") : quote.status === "Pending" ? t("public.exploreStatusPending") : quote.status === "Sent" ? t("public.exploreStatusSent") : quote.status}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
              <span>{quote.extra_services.join(" · ") || t("public.exploreStandardService")}</span>
              <span className="font-semibold text-slate-900">{formatCurrency(quote.total_estimate, locale)}</span>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

function InvoicesTab({ data, locale, t }: { data: DemoData; locale: string; t: (key: string, vars?: Record<string, string | number>) => string }) {
  return (
    <SectionShell title={t("nav.invoices")} subtitle={t("public.exploreInvoicesSubtitle")} readOnlyLabel={t("public.exploreReadOnlyDemo")}>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t("public.invoice")}</th>
              <th className="px-4 py-3 font-medium">{t("public.customer")}</th>
              <th className="px-4 py-3 font-medium">{t("public.amount")}</th>
              <th className="px-4 py-3 font-medium">{t("public.due")}</th>
              <th className="px-4 py-3 font-medium">{t("public.status")}</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.slice(0, 16).map((invoice) => (
              <tr key={invoice.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{invoice.invoice_number}</td>
                <td className="px-4 py-3 text-slate-600">{invoice.customer_name}</td>
                <td className="px-4 py-3 text-slate-900">{formatCurrency(invoice.amount, locale)}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(invoice.due_date, locale)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${invoice.status === "Paid" ? "bg-emerald-50 text-emerald-700" : invoice.status === "Overdue" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                    {invoice.status === "Paid" ? t("public.exploreStatusPaid") : invoice.status === "Overdue" ? t("public.exploreStatusOverdue") : invoice.status === "Pending" ? t("public.exploreStatusPending") : invoice.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}

function ReportsTab({ data, locale, t }: { data: DemoData; locale: string; t: (key: string, vars?: Record<string, string | number>) => string }) {
  const approvedMileage = data.mileageRequests.filter((request) => request.status === "approved").length;
  const pendingMileage = data.mileageRequests.filter((request) => request.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={t("public.exploreRevenueMonths")} value={new Intl.NumberFormat(locale).format(data.revenueHistory.length)} hint={t("public.exploreRolling12")} />
        <StatCard label={t("public.exploreMileageApproved")} value={new Intl.NumberFormat(locale).format(approvedMileage)} hint={t("public.exploreSupervisorReviewed")} />
        <StatCard label={t("public.exploreMileagePending")} value={new Intl.NumberFormat(locale).format(pendingMileage)} hint={t("public.exploreAwaitingApproval")} />
      </div>

      <SectionShell title={t("public.exploreAiJobReports")} subtitle={t("public.exploreAiJobReportsSubtitle")} readOnlyLabel={t("public.exploreReadOnlyDemo")}>
        <div className="grid gap-4 xl:grid-cols-2">
          {data.completedJobs.slice(0, 8).map((job) => (
            <article key={job.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{job.customer_name}</p>
                  <p className="text-sm text-slate-500">{job.employee_name} · {formatDate(job.scheduled_date, locale)}</p>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{t("public.exploreReport")}</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{job.report_summary}</p>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell title={t("public.exploreMileageRequests")} subtitle={t("public.exploreMileageRequestsSubtitle")} readOnlyLabel={t("public.exploreReadOnlyDemo")}>
        <div className="grid gap-3 md:grid-cols-2">
          {data.mileageRequests.slice(0, 10).map((request) => (
            <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{request.employee_name}</p>
                  <p className="text-sm text-slate-500">{new Intl.NumberFormat(locale).format(request.miles)} {t("public.miles")} · {request.notes}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === "approved" ? "bg-emerald-50 text-emerald-700" : request.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                  {request.status === "approved" ? t("public.exploreStatusApproved") : request.status === "pending" ? t("public.exploreStatusPending") : request.status === "rejected" ? t("public.exploreStatusRejected") : request.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      </SectionShell>
    </div>
  );
}

export function ExploreDemoShell({ data }: ExploreDemoShellProps) {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "dashboard", label: t("public.exploreTabDashboard") },
    { id: "customers", label: t("public.exploreTabCustomers") },
    { id: "employees", label: t("public.exploreTabEmployees") },
    { id: "jobs", label: t("public.exploreTabJobs") },
    { id: "quotes", label: t("public.exploreTabQuotes") },
    { id: "invoices", label: t("public.exploreTabInvoices") },
    { id: "reports", label: t("public.exploreTabReports") },
  ];

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case "customers":
        return <CustomersTab data={data} t={t} />;
      case "employees":
        return <EmployeesTab data={data} locale={locale} t={t} />;
      case "jobs":
        return <JobsTab data={data} locale={locale} t={t} />;
      case "quotes":
        return <QuotesTab data={data} locale={locale} t={t} />;
      case "invoices":
        return <InvoicesTab data={data} locale={locale} t={t} />;
      case "reports":
        return <ReportsTab data={data} locale={locale} t={t} />;
      case "dashboard":
      default:
        return <DashboardTab data={data} locale={locale} t={t} />;
    }
  }, [activeTab, data, locale, t]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e2f2ff_0%,#f8fbff_52%,#eef4ff_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 rounded-[1.75rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900 shadow-sm">
          {t("public.exploreBanner")}
        </div>

        <header className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <ServiceOSBrand showTagline />
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-700">{t("public.exploreBannerTitle")}</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">{data.companyName}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  {t("public.exploreIntro")}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                {t("public.startFreeTrial")}
              </Link>
              <div className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">
                {t("public.exploreReadOnlyMode")}
              </div>
            </div>
          </div>
        </header>

        <nav className="mt-5 flex flex-wrap gap-2 rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeTab === tab.id ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="mt-5 flex-1">{activeContent}</main>

        <footer className="py-8 text-center text-xs text-slate-500">
          {t("public.exploreFooter")}
        </footer>
      </div>
    </div>
  );
}
