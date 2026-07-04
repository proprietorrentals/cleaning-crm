"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type JobRecord = {
  id: string;
  client_name: string;
  contact_name: string;
  assigned_employee: string;
  cleaning_date: string;
  status: string;
  notes: string;
};

type DashboardStatsState = {
  customersCount: number;
  activeJobsCount: number;
  monthlyRevenue: number;
  pendingQuotesCount: number;
};

const navigationItems = [
  { label: "Dashboard", href: "/", active: true, icon: "▣" },
  { label: "Customers", href: "/customers", icon: "◫" },
  { label: "Quotes", href: "/quotes", icon: "◧" },
  { label: "Jobs", href: "/jobs", icon: "◔" },
  { label: "Employees", href: "/employees", icon: "◍" },
  { label: "Invoices", href: "/invoices", icon: "◐" },
  { label: "Reports", href: "/", icon: "◑" },
  { label: "Settings", href: "/", icon: "⚙" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<DashboardStatsState>({
    customersCount: 0,
    activeJobsCount: 0,
    monthlyRevenue: 0,
    pendingQuotesCount: 0,
  });
  const [recentJobs, setRecentJobs] = useState<JobRecord[]>([]);
  const [schedule, setSchedule] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [customersResponse, quotesResponse, jobsResponse, invoicesResponse] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("quotes").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("*").order("cleaning_date", { ascending: true }),
        supabase.from("invoices").select("amount").gte("created_at", startOfMonth),
      ]);

      const jobs = jobsResponse.data ?? [];
      const upcomingJobs = jobs
        .filter((job) => job.status !== "Completed")
        .sort((a, b) => (a.cleaning_date > b.cleaning_date ? 1 : -1))
        .slice(0, 3);
      const recentJobList = jobs
        .slice()
        .sort((a, b) => (a.cleaning_date > b.cleaning_date ? -1 : 1))
        .slice(0, 3);
      const monthlyRevenue = (invoicesResponse.data ?? []).reduce(
        (sum, invoice) => sum + Number(invoice.amount ?? 0),
        0,
      );

      setStats({
        customersCount: customersResponse.count ?? 0,
        activeJobsCount: jobs.filter((job) => job.status !== "Completed").length,
        monthlyRevenue,
        pendingQuotesCount: quotesResponse.count ?? 0,
      });
      setRecentJobs(recentJobList);
      setSchedule(upcomingJobs);
      setLoading(false);
    };

    fetchDashboardData();
  }, [supabase]);

  const cards = useMemo(
    () => [
      {
        title: "Total Customers",
        value: stats.customersCount.toString(),
        change: "+ live records",
        accent: "bg-blue-600",
      },
      {
        title: "Active Jobs",
        value: stats.activeJobsCount.toString(),
        change: "scheduled or in progress",
        accent: "bg-cyan-500",
      },
      {
        title: "Monthly Revenue",
        value: formatCurrency(stats.monthlyRevenue),
        change: "current month",
        accent: "bg-sky-500",
      },
      {
        title: "Pending Quotes",
        value: stats.pendingQuotesCount.toString(),
        change: "saved in Supabase",
        accent: "bg-indigo-500",
      },
    ],
    [stats],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white/90 px-5 py-6 backdrop-blur lg:w-64 lg:border-b-0 lg:border-r lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-lg font-semibold text-white">
              C
            </div>
            <div>
              <p className="text-lg font-semibold">Cleaning CRM</p>
              <p className="text-sm text-slate-500">Operations Hub</p>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  item.active
                    ? "bg-blue-600 text-white shadow-sm"
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
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-sm font-medium text-blue-600">Welcome back</p>
              <h1 className="text-2xl font-semibold text-slate-900">
                Commercial cleaning overview
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                <span>⌕</span>
                <input
                  className="w-full bg-transparent outline-none sm:w-48"
                  placeholder="Search"
                  aria-label="Search"
                />
              </label>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
                aria-label="Notifications"
              >
                🔔
              </button>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                  AJ
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Alicia James</p>
                  <p className="text-xs text-slate-500">Operations Lead</p>
                </div>
              </div>
            </div>
          </header>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className={`mb-4 h-2.5 w-16 rounded-full ${item.accent}`} />
                <p className="text-sm text-slate-500">{item.title}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {item.value}
                </p>
                <p className="mt-2 text-sm text-slate-500">{item.change}</p>
              </div>
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-600 to-sky-500 p-6 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100">Today’s focus</p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    {stats.activeJobsCount} jobs are currently in motion
                  </h2>
                </div>
                <div className="rounded-2xl bg-white/15 px-3 py-2 text-sm">
                  Live CRM data
                </div>
              </div>
              <p className="mt-4 max-w-xl text-sm text-blue-50">
                Review active jobs, crew assignments, and upcoming services directly from Supabase.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Upcoming schedule</h3>
                <span className="text-sm text-slate-500">Next visits</span>
              </div>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">Loading schedule...</div>
                ) : schedule.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">No upcoming jobs yet.</div>
                ) : (
                  schedule.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-slate-50 p-3">
                      <p className="font-medium text-slate-900">{item.client_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.cleaning_date}</p>
                      <p className="mt-1 text-sm font-medium text-blue-600">
                        {item.assigned_employee || "Unassigned"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Recent jobs</h3>
                <Link href="/jobs" className="text-sm font-medium text-blue-600">
                  View all
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">Loading jobs...</div>
                ) : recentJobs.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">No recent jobs yet.</div>
                ) : (
                  recentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{job.client_name}</p>
                        <p className="text-sm text-slate-500">{job.status}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                        {job.cleaning_date}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Performance snapshot</h3>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">On-time completion</span>
                    <span className="font-semibold text-slate-900">94%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 w-[94%] rounded-full bg-blue-600" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Customer satisfaction</span>
                    <span className="font-semibold text-slate-900">4.9/5</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 w-[98%] rounded-full bg-cyan-500" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Quote conversion</span>
                    <span className="font-semibold text-slate-900">67%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 w-[67%] rounded-full bg-indigo-500" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
