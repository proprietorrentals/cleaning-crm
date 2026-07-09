"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminGuard } from "@/components/admin-guard";
import { ServiceFlowBrand } from "@/components/serviceflow-brand";
import Link from "next/link";

type Settings = {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_logo_url: string;
  late_clock_in_grace_period_minutes: string;
};

function SettingsContent() {
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<Settings>({
    company_name: "",
    company_address: "",
    company_phone: "",
    company_email: "",
    company_logo_url: "",
    late_clock_in_grace_period_minutes: "15",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Get current user's tenant ID
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user?.id) {
          setLoading(false);
          return;
        }

        // Query settings by tenant_id (uses RLS automatically)
        const { data } = await supabase
          .from("settings")
          .select("*")
          .maybeSingle();

        if (data) {
          setForm({
            company_name: data.company_name ?? "",
            company_address: data.company_address ?? "",
            company_phone: data.company_phone ?? "",
            company_email: data.company_email ?? "",
            company_logo_url: data.company_logo_url ?? "",
            late_clock_in_grace_period_minutes: String(data.late_clock_in_grace_period_minutes ?? 15),
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Upsert settings for current tenant (RLS will enforce tenant_id)
      const lateGraceMinutes = Number(form.late_clock_in_grace_period_minutes) || 15;
      const { error } = await supabase
        .from("settings")
        .upsert({ ...form, late_clock_in_grace_period_minutes: lateGraceMinutes, updated_at: new Date().toISOString() }, {
          onConflict: "tenant_id",
        });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Settings saved." });
      }
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

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
              { label: "Reports",    href: "/reports" },
              { label: "Settings",   href: "/settings", active: true },
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
            <p className="text-sm font-medium text-blue-600">Company</p>
            <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          </header>

          {loading ? (
            <p className="text-sm text-slate-500">Loading settings…</p>
          ) : (
            <form onSubmit={handleSave} className="mx-auto max-w-2xl space-y-6">

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-slate-900">Company Information</h2>
                <div className="space-y-4">

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Company Name</label>
                    <input
                      type="text"
                      value={form.company_name}
                      onChange={set("company_name")}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="ServiceFlow CRM"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
                    <textarea
                      value={form.company_address}
                      onChange={set("company_address")}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none resize-none"
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
                      <input
                        type="tel"
                        value={form.company_phone}
                        onChange={set("company_phone")}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="(555) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                      <input
                        type="email"
                        value={form.company_email}
                        onChange={set("company_email")}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="info@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Logo URL</label>
                    <input
                      type="url"
                      value={form.company_logo_url}
                      onChange={set("company_logo_url")}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-slate-900">Employee Attendance</h2>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Late clock-in grace period (minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.late_clock_in_grace_period_minutes}
                    onChange={(e) => setForm((p) => ({ ...p, late_clock_in_grace_period_minutes: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="15"
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    If an employee has not clocked in by the scheduled start time plus this grace period, an admin-only late alert is created.
                  </p>
                </div>
              </section>

              {message && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    message.type === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Settings"}
                </button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AdminGuard>
      <SettingsContent />
    </AdminGuard>
  );
}
