"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SuperAdminGuard } from "@/components/super-admin-guard";

type Tenant = {
  id: string;
  company_name: string;
  owner_email: string;
  plan: string;
  status: string;
  created_at: string;
};

const PLAN_STYLES: Record<string, string> = {
  starter:      "bg-slate-800 text-slate-300",
  professional: "bg-blue-950 text-blue-300",
  enterprise:   "bg-violet-950 text-violet-300",
};

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-950 text-emerald-300",
  suspended: "bg-red-950 text-red-300",
  cancelled: "bg-slate-800 text-slate-400",
};

function SuperAdminDashboardContent() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ company_name: "", owner_email: "", plan: "starter" });

  const fetchTenants = useMemo(
    () => async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });
      setTenants(data ?? []);
      setLoading(false);
    },
    [supabase],
  );

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from("tenants").insert(form);
    setForm({ company_name: "", owner_email: "", plan: "starter" });
    setShowForm(false);
    await fetchTenants();
    setSaving(false);
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "suspended" : "active";
    await supabase.from("tenants").update({ status: next }).eq("id", id);
    await fetchTenants();
  };

  const activeTenants   = tenants.filter((t) => t.status === "active").length;
  const suspendedTenants = tenants.filter((t) => t.status === "suspended").length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-lg">⚡</div>
            <div>
              <h1 className="text-lg font-bold text-white">ServiceOS Platform</h1>
              <p className="text-xs text-slate-400">Super Admin Console</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => { await supabase.auth.signOut(); router.push("/super-admin/login"); }}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 transition"
          >
            Sign out
          </button>
        </header>

        {/* Stats */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Tenants",   value: tenants.length,    color: "text-violet-400" },
            { label: "Active",          value: activeTenants,     color: "text-emerald-400" },
            { label: "Suspended",       value: suspendedTenants,  color: "text-red-400"    },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </section>

        {/* Tenants table */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Tenants</h2>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition"
            >
              + Add Tenant
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleAdd}
              className="mb-6 grid gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 sm:grid-cols-3"
            >
              <input
                type="text"
                placeholder="Company name"
                value={form.company_name}
                onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                required
                className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none"
              />
              <input
                type="email"
                placeholder="Owner email"
                value={form.owner_email}
                onChange={(e) => setForm((p) => ({ ...p, owner_email: e.target.value }))}
                required
                className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={form.plan}
                  onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {saving ? "…" : "Add"}
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <p className="py-4 text-sm text-slate-500">Loading tenants…</p>
            ) : tenants.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No tenants yet. Add the first one above.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    {["Company", "Owner", "Plan", "Status", "Joined", ""].map((h) => (
                      <th key={h} className="pb-3 pr-4 font-medium text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tenants.map((t) => (
                    <tr key={t.id}>
                      <td className="py-3 pr-4 font-medium text-white">{t.company_name}</td>
                      <td className="py-3 pr-4 text-slate-400">{t.owner_email}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_STYLES[t.plan] ?? PLAN_STYLES.starter}`}>
                          {t.plan}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[t.status] ?? STATUS_STYLES.active}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleStatus(t.id, t.status)}
                          className="text-xs text-slate-400 hover:text-white transition"
                        >
                          {t.status === "active" ? "Suspend" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  return (
    <SuperAdminGuard>
      <SuperAdminDashboardContent />
    </SuperAdminGuard>
  );
}
