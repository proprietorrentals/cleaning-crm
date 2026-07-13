"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminGuard } from "@/components/admin-guard";
import { ServiceOSLogo } from "@/components/serviceos-logo";
import Link from "next/link";

type Job = {
  id: string;
  customer_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  status: string;
  estimated_value: number;
  notes: string | null;
  assigned_employee: string | null;
};

type Customer = {
  id: string;
  company_name: string;
  address: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  Scheduled:   "bg-blue-50 text-blue-700",
  "In Progress": "bg-amber-50 text-amber-700",
  Completed:   "bg-emerald-50 text-emerald-700",
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(value: string | null | undefined) {
  if (!value) {
    return "8:00 AM";
  }

  const normalized = value.length === 5 ? `${value}:00` : value;
  return new Date(`1970-01-01T${normalized}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v ?? 0);
}

function isoToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().split("T")[0];
}

function ScheduleContent() {
  const supabase = useMemo(() => createClient(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customersById, setCustomersById] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const today = isoToday();

      const { data: jobData } = await supabase
        .from("jobs")
        .select("id,customer_id,scheduled_date,scheduled_start_time,status,estimated_value,notes,assigned_employee")
        .gte("scheduled_date", today)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_start_time", { ascending: true });

      const safeJobs = jobData ?? [];
      setJobs(safeJobs);

      const ids = [...new Set(safeJobs.map((j) => j.customer_id).filter(Boolean))];
      if (ids.length > 0) {
        const { data: customers } = await supabase
          .from("customers")
          .select("id,company_name,address")
          .in("id", ids);
        const map: Record<string, Customer> = {};
        for (const c of customers ?? []) map[c.id] = c;
        setCustomersById(map);
      }
      setLoading(false);
    };
    load();
  }, [supabase]);

  // Group jobs by scheduled_date
  const grouped = useMemo(() => {
    const map: Record<string, Job[]> = {};
    for (const job of jobs) {
      (map[job.scheduled_date] ??= []).push(job);
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayJobs]) => [
        date,
        dayJobs.slice().sort((left, right) => left.scheduled_start_time.localeCompare(right.scheduled_start_time)),
      ] as const);
  }, [jobs]);

  const today = isoToday();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white/90 px-5 py-6 lg:w-64 lg:border-b-0 lg:border-r">
          <ServiceOSLogo variant="horizontal" size="compact-sidebar" subtitle="Operations Hub" />
          <nav className="mt-8 space-y-1">
            {[
              { label: "Dashboard",  href: "/" },
              { label: "Customers",  href: "/customers" },
              { label: "Quotes",     href: "/quotes" },
              { label: "Jobs",       href: "/jobs" },
              { label: "Employees",  href: "/employees" },
              { label: "Invoices",   href: "/invoices" },
              { label: "Schedule",   href: "/schedule", active: true },
              { label: "Reports",    href: "/reports" },
              { label: "Settings",   href: "/settings" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  item.active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <div>
              <p className="text-sm font-medium text-blue-600">Upcoming</p>
              <h1 className="text-2xl font-semibold text-slate-900">Schedule</h1>
            </div>
            <Link href="/jobs" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              + New Job
            </Link>
          </header>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Loading schedule…
            </div>
          ) : grouped.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              No upcoming jobs scheduled.{" "}
              <Link href="/jobs" className="text-blue-600 hover:underline">Create one</Link>.
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([date, dayJobs]) => (
                <section key={date}>
                  <div className="mb-3 flex items-center gap-3">
                    <h2 className={`text-base font-semibold ${date === today ? "text-blue-700" : "text-slate-900"}`}>
                      {formatDate(date)}
                    </h2>
                    {date === today && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Today</span>
                    )}
                    <span className="text-sm text-slate-400">{dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {dayJobs.map((job) => {
                      const customer = customersById[job.customer_id];
                      return (
                        <Link
                          key={job.id}
                          href={`/jobs`}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-900">{customer?.company_name ?? "Customer"}</p>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status] ?? "bg-slate-100 text-slate-600"}`}>
                              {job.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">Start: {formatTime(job.scheduled_start_time)}</p>
                          {customer?.address && (
                            <p className="mt-1 text-xs text-slate-500 line-clamp-1">{customer.address}</p>
                          )}
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-700">{formatCurrency(job.estimated_value)}</p>
                            {job.assigned_employee && (
                              <p className="text-xs text-slate-500">{job.assigned_employee}</p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <AdminGuard>
      <ScheduleContent />
    </AdminGuard>
  );
}
