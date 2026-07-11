"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ServiceOSBrand } from "@/components/serviceos-brand";
import type { DemoData, DemoJob, DemoInvoice, DemoQuote, DemoMileageRequest, DemoRevenuePoint } from "@/lib/explore-demo-data";

type TabId = "dashboard" | "customers" | "employees" | "jobs" | "quotes" | "invoices" | "reports";

type ExploreDemoShellProps = {
  data: DemoData;
};

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "dashboard", label: "AI Supervisor Dashboard" },
  { id: "customers", label: "Customers" },
  { id: "employees", label: "Employees" },
  { id: "jobs", label: "Jobs" },
  { id: "quotes", label: "Quotes" },
  { id: "invoices", label: "Invoices" },
  { id: "reports", label: "Reports" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
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

function SectionShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">Read-only demo</p>
      </div>
      {children}
    </section>
  );
}

function RevenueBars({ data }: { data: DemoRevenuePoint[] }) {
  const max = Math.max(...data.map((entry) => entry.total), 1);

  return (
    <div className="flex h-44 items-end gap-2 sm:gap-3">
      {data.map((entry) => (
        <div key={entry.label} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-[10px] font-medium text-slate-500">{formatCurrency(entry.total)}</span>
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

function DemoPhotoGrid({ job }: { job: DemoJob }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[job.before_photo_url, job.after_photo_url].filter(Boolean).map((photoUrl, index) => (
        <div key={`${job.id}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <img src={photoUrl ?? ""} alt={`${index === 0 ? "Before" : "After"} photo for ${job.customer_name}`} className="h-32 w-full object-cover" />
          <div className="px-3 py-2 text-xs font-medium text-slate-600">{index === 0 ? "Before photo" : "After photo"}</div>
        </div>
      ))}
    </div>
  );
}

function DashboardTab({ data }: { data: DemoData }) {
  const completedJobs = data.completedJobs.length;
  const scheduledJobs = data.scheduledJobs.length;
  const totalCustomers = data.customers.length;
  const totalEmployees = data.employees.length;
  const paidInvoices = data.invoices.filter((invoice) => invoice.status === "Paid").length;
  const totalRevenue = data.invoices.filter((invoice) => invoice.status === "Paid").reduce((sum, invoice) => sum + invoice.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={String(totalCustomers)} hint="Seeded demo accounts" />
        <StatCard label="Employees" value={String(totalEmployees)} hint="Field and operations staff" />
        <StatCard label="Completed Jobs" value={String(completedJobs)} hint="Historical service visits" />
        <StatCard label="Scheduled Jobs" value={String(scheduledJobs)} hint="Upcoming service visits" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <SectionShell title="Revenue History" subtitle="Paid invoice volume across the last 12 months.">
          <RevenueBars data={data.revenueHistory} />
        </SectionShell>

        <SectionShell title="Supervisor Summary" subtitle="The demo surfaces the same operational signals the live dashboard uses.">
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">ServiceOS Demo Cleaning</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm text-slate-500">Collected revenue from paid invoices</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Paid invoices</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-900">{paidInvoices}</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-700">Coverage</p>
                <p className="mt-2 text-2xl font-semibold text-sky-900">{Math.round((paidInvoices / data.invoices.length) * 100)}%</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">Brand Promise</p>
              <p className="mt-1 text-sm text-slate-500">Operate with Confidence.</p>
            </div>
          </div>
        </SectionShell>
      </div>
    </div>
  );
}

function CustomersTab({ data }: { data: DemoData }) {
  return (
    <SectionShell title="Customers" subtitle="40 seeded customer accounts with company, contact, and service details.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.customers.map((customer) => (
          <article key={customer.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-base font-semibold text-slate-900">{customer.company_name}</p>
            <p className="text-sm text-slate-600">{customer.contact_name}</p>
            <div className="mt-3 space-y-1 text-sm text-slate-500">
              <p>{customer.email}</p>
              <p>{customer.phone}</p>
              <p>{customer.cleaning_frequency} service</p>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

function EmployeesTab({ data }: { data: DemoData }) {
  return (
    <SectionShell title="Employees" subtitle="12 seeded employees with performance, role, and active workload context.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.employees.map((employee) => (
          <article key={employee.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">{employee.first_name} {employee.last_name}</p>
                <p className="text-sm text-slate-500">{employee.role} · {employee.department}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{employee.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Active</p>
                <p className="font-semibold text-slate-900">{employee.active_jobs}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Completed</p>
                <p className="font-semibold text-slate-900">{employee.completed_jobs}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Rating</p>
                <p className="font-semibold text-slate-900">{employee.rating}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

function JobsTab({ data }: { data: DemoData }) {
  const featuredCompletedJobs = data.completedJobs.slice(0, 6);
  const featuredScheduledJobs = data.scheduledJobs.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Completed" value={String(data.completedJobs.length)} hint="Before and after photos included" />
        <StatCard label="Scheduled" value={String(data.scheduledJobs.length)} hint="Future service calendar" />
        <StatCard label="Signed" value={String(data.completedJobs.filter((job) => !!job.signature_url).length)} hint="Customer signatures captured" />
        <StatCard label="Mileage Requests" value={String(data.mileageRequests.length)} hint="Included in demo workflow" />
      </div>

      <SectionShell title="Completed Jobs" subtitle="Photo evidence, customer signatures, and AI report summaries are shown in read-only mode.">
        <div className="grid gap-4 xl:grid-cols-2">
          {featuredCompletedJobs.map((job) => (
            <article key={job.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{job.customer_name}</p>
                  <p className="text-sm text-slate-500">{job.employee_name} · {formatDate(job.scheduled_date)} · {job.scheduled_start_time}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Completed</span>
              </div>
              <div className="mt-4"><DemoPhotoGrid job={job} /></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Customer signature</p>
                  <img src={job.signature_url ?? ""} alt={`Signature for ${job.customer_name}`} className="mt-2 h-20 w-full rounded-xl object-contain bg-white" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI Job Report</p>
                  <p className="mt-2 text-sm text-slate-700">{job.report_summary}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell title="Scheduled Jobs" subtitle="25 upcoming jobs are seeded into the demo schedule.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {featuredScheduledJobs.map((job) => (
            <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-semibold text-slate-900">{job.customer_name}</p>
              <p className="text-sm text-slate-500">{job.employee_name}</p>
              <p className="mt-2 text-sm text-slate-600">{formatDate(job.scheduled_date)} · {job.scheduled_start_time}</p>
              <p className="mt-3 text-sm text-slate-500">{job.notes}</p>
            </article>
          ))}
        </div>
      </SectionShell>
    </div>
  );
}

function QuotesTab({ data }: { data: DemoData }) {
  return (
    <SectionShell title="Quotes" subtitle="40 seeded quotes with estimate data and status coverage.">
      <div className="grid gap-3 xl:grid-cols-2">
        {data.quotes.slice(0, 12).map((quote) => (
          <article key={quote.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{quote.customer_name}</p>
                <p className="text-sm text-slate-500">{quote.square_footage.toLocaleString()} sq ft · {quote.cleaning_frequency}</p>
              </div>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{quote.status}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
              <span>{quote.extra_services.join(" · ") || "Standard service"}</span>
              <span className="font-semibold text-slate-900">{formatCurrency(quote.total_estimate)}</span>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

function InvoicesTab({ data }: { data: DemoData }) {
  return (
    <SectionShell title="Invoices" subtitle="Invoice lifecycle is seeded for paid, pending, and overdue coverage.">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.invoices.slice(0, 16).map((invoice) => (
              <tr key={invoice.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{invoice.invoice_number}</td>
                <td className="px-4 py-3 text-slate-600">{invoice.customer_name}</td>
                <td className="px-4 py-3 text-slate-900">{formatCurrency(invoice.amount)}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(invoice.due_date)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${invoice.status === "Paid" ? "bg-emerald-50 text-emerald-700" : invoice.status === "Overdue" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                    {invoice.status}
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

function ReportsTab({ data }: { data: DemoData }) {
  const approvedMileage = data.mileageRequests.filter((request) => request.status === "approved").length;
  const pendingMileage = data.mileageRequests.filter((request) => request.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Revenue Months" value={String(data.revenueHistory.length)} hint="Rolling 12 month chart" />
        <StatCard label="Mileage Approved" value={String(approvedMileage)} hint="Supervisor-reviewed requests" />
        <StatCard label="Mileage Pending" value={String(pendingMileage)} hint="Awaiting approval" />
      </div>

      <SectionShell title="AI Job Reports" subtitle="Summaries are generated from the completed job seed set.">
        <div className="grid gap-4 xl:grid-cols-2">
          {data.completedJobs.slice(0, 8).map((job) => (
            <article key={job.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{job.customer_name}</p>
                  <p className="text-sm text-slate-500">{job.employee_name} · {formatDate(job.scheduled_date)}</p>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Report</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{job.report_summary}</p>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell title="Mileage Requests" subtitle="Read-only approval history for route-based mileage claims.">
        <div className="grid gap-3 md:grid-cols-2">
          {data.mileageRequests.slice(0, 10).map((request) => (
            <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{request.employee_name}</p>
                  <p className="text-sm text-slate-500">{request.miles} miles · {request.notes}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === "approved" ? "bg-emerald-50 text-emerald-700" : request.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                  {request.status}
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
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case "customers":
        return <CustomersTab data={data} />;
      case "employees":
        return <EmployeesTab data={data} />;
      case "jobs":
        return <JobsTab data={data} />;
      case "quotes":
        return <QuotesTab data={data} />;
      case "invoices":
        return <InvoicesTab data={data} />;
      case "reports":
        return <ReportsTab data={data} />;
      case "dashboard":
      default:
        return <DashboardTab data={data} />;
    }
  }, [activeTab, data]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e2f2ff_0%,#f8fbff_52%,#eef4ff_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 rounded-[1.75rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900 shadow-sm">
          {data.bannerMessage}
        </div>

        <header className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <ServiceOSBrand subtitle="Operate with Confidence." showTagline />
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-700">ServiceOS Explore Demo</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">{data.companyName}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Explore the ServiceOS experience with seeded customers, employees, jobs, quotes, invoices, reports, mileage activity, and AI supervisor intelligence. Everything below is read-only.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                Start Free Trial
              </Link>
              <div className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">
                Read-only mode
              </div>
            </div>
          </div>
        </header>

        <nav className="mt-5 flex flex-wrap gap-2 rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-sm">
          {TABS.map((tab) => (
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
          Explore demo seeded with 40 customers, 12 employees, 120 completed jobs, 25 scheduled jobs, quotes, invoices, photos, signatures, AI reports, mileage requests, and revenue history.
        </footer>
      </div>
    </div>
  );
}
