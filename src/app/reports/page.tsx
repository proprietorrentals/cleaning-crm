"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminGuard } from "@/components/admin-guard";
import { ServiceFlowBrand } from "@/components/serviceflow-brand";
import Link from "next/link";

type InvoiceRow = { amount: number; status: string; created_at: string };
type JobRow     = { status: string };
type EmpRow     = { id: string; first_name: string; last_name: string };
type JobEmpRow  = { assigned_employee_id: string | null; status: string };

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function buildMonthlyRevenue(invoices: InvoiceRow[]) {
  const now = new Date();
  const months: { label: string; key: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: monthLabel(d), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, total: 0 });
  }
  for (const inv of invoices) {
    const k = inv.created_at.slice(0, 7);
    const month = months.find((m) => m.key === k);
    if (month) month.total += Number(inv.amount ?? 0);
  }
  return months;
}

function ReportsContent() {
  const supabase = useMemo(() => createClient(), []);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [employees, setEmployees] = useState<EmpRow[]>([]);
  const [jobsByEmployee, setJobsByEmployee] = useState<JobEmpRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [invRes, jobRes, empRes, jobEmpRes] = await Promise.all([
        supabase.from("invoices").select("amount,status,created_at").gte("created_at", sixMonthsAgo.toISOString()),
        supabase.from("jobs").select("status"),
        supabase.from("employees").select("id,first_name,last_name").eq("is_active", true),
        supabase.from("jobs").select("assigned_employee_id,status"),
      ]);

      setInvoices(invRes.data ?? []);
      setJobs(jobRes.data ?? []);
      setEmployees(empRes.data ?? []);
      setJobsByEmployee(jobEmpRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [supabase]);

  const monthlyRevenue = useMemo(() => buildMonthlyRevenue(invoices), [invoices]);
  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.total), 1);

  const totalRevenue  = invoices.reduce((s, i) => s + Number(i.amount ?? 0), 0);
  const paidInvoices  = invoices.filter((i) => i.status === "Paid").length;
  const totalInvoices = invoices.length;
  const collectionRate = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

  const completedJobs  = jobs.filter((j) => j.status === "Completed").length;
  const inProgressJobs = jobs.filter((j) => j.status === "In Progress").length;
  const scheduledJobs  = jobs.filter((j) => j.status === "Scheduled").length;

  const employeeStats = useMemo(() =>
    employees.map((emp) => {
      const assigned  = jobsByEmployee.filter((j) => j.assigned_employee_id === emp.id).length;
      const completed = jobsByEmployee.filter((j) => j.assigned_employee_id === emp.id && j.status === "Completed").length;
      return { ...emp, assigned, completed };
    }).sort((a, b) => b.completed - a.completed),
    [employees, jobsByEmployee],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white/90 px-5 py-6 lg:w-64 lg:border-b-0 lg:border-r">
          <ServiceFlowBrand subtitle="Operations Hub" />
          <nav className="mt-8 space-y-1">
            {[
              { label: "Dashboard",  href: "/" },
              { label: "Customers",  href: "/customers" },
              { label: "Quotes",     href: "/quotes" },
              { label: "Jobs",       href: "/jobs" },
              { label: "Employees",  href: "/employees" },
              { label: "Invoices",   href: "/invoices" },
              { label: "Schedule",   href: "/schedule" },
              { label: "Reports",    href: "/reports", active: true },
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
          <header className="mb-6 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <p className="text-sm font-medium text-blue-600">Last 6 months</p>
            <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          </header>

          {loading ? (
            <p className="text-sm text-slate-500">Loading reports…</p>
          ) : (
            <div className="space-y-6">

              {/* KPI cards */}
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Total Revenue",     value: formatCurrency(totalRevenue),     sub: "last 6 months",         accent: "bg-blue-600" },
                  { label: "Collection Rate",   value: `${collectionRate}%`,             sub: `${paidInvoices}/${totalInvoices} invoices paid`, accent: "bg-emerald-500" },
                  { label: "Jobs Completed",    value: completedJobs.toString(),         sub: "all time",              accent: "bg-cyan-500" },
                  { label: "Jobs In Progress",  value: inProgressJobs.toString(),        sub: `${scheduledJobs} scheduled`, accent: "bg-indigo-500" },
                ].map((c) => (
                  <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className={`mb-3 h-2 w-12 rounded-full ${c.accent}`} />
                    <p className="text-sm text-slate-500">{c.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{c.value}</p>
                    <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
                  </div>
                ))}
              </section>

              {/* Monthly revenue bar chart (CSS-only) */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Monthly Revenue</h2>
                <div className="flex h-40 items-end gap-3">
                  {monthlyRevenue.map((m) => (
                    <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-slate-500">{formatCurrency(m.total)}</span>
                      <div
                        className="w-full rounded-t-lg bg-blue-600 transition-all"
                        style={{ height: `${(m.total / maxRevenue) * 100}%`, minHeight: m.total > 0 ? "4px" : "2px" }}
                      />
                      <span className="text-[10px] text-slate-400">{m.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Jobs by status */}
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">Jobs by Status</h2>
                  <div className="space-y-3">
                    {[
                      { label: "Completed",   count: completedJobs,  color: "bg-emerald-500" },
                      { label: "In Progress", count: inProgressJobs, color: "bg-amber-500"   },
                      { label: "Scheduled",   count: scheduledJobs,  color: "bg-blue-500"    },
                    ].map(({ label, count, color }) => {
                      const total = jobs.length || 1;
                      return (
                        <div key={label}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="text-slate-600">{label}</span>
                            <span className="font-semibold text-slate-900">{count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${(count / total) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Employee performance */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">Employee Performance</h2>
                  {employeeStats.length === 0 ? (
                    <p className="text-sm text-slate-500">No employees found.</p>
                  ) : (
                    <div className="space-y-3">
                      {employeeStats.slice(0, 6).map((emp) => (
                        <div key={emp.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                          <div>
                            <p className="font-medium text-slate-900">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-slate-500">{emp.assigned} assigned</p>
                          </div>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-semibold text-emerald-700">
                            {emp.completed} done
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AdminGuard>
      <ReportsContent />
    </AdminGuard>
  );
}
