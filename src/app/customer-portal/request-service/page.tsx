"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ServiceOSBrand } from "@/components/serviceos-brand";
import Link from "next/link";
import { useRouter } from "next/navigation";

const SERVICE_TYPES = [
  "Standard Cleaning",
  "Deep Cleaning",
  "Post-Construction Cleanup",
  "Move-In / Move-Out Cleaning",
  "Window Cleaning",
  "Carpet Cleaning",
  "Pressure Washing",
  "Other",
];

type ServiceRequest = {
  id: string;
  service_type: string;
  preferred_date: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700",
  reviewed:  "bg-blue-50 text-blue-700",
  converted: "bg-emerald-50 text-emerald-700",
  declined:  "bg-red-50 text-red-700",
};

export default function RequestServicePage() {
  const supabase   = useMemo(() => createClient(), []);
  const router     = useRouter();
  const [customerId,  setCustomerId]  = useState<string | null>(null);
  const [requests,    setRequests]    = useState<ServiceRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [message,     setMessage]     = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ service_type: SERVICE_TYPES[0], preferred_date: "", notes: "" });

  const fetchRequests = useMemo(
    () => async (cId: string) => {
      const { data } = await supabase
        .from("service_requests")
        .select("id,service_type,preferred_date,notes,status,created_at")
        .eq("customer_id", cId)
        .order("created_at", { ascending: false });
      setRequests(data ?? []);
    },
    [supabase],
  );

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace("/customer-auth"); return; }

      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!customer) { router.replace("/customer-portal"); return; }

      setCustomerId(customer.id);
      await fetchRequests(customer.id);
      setLoading(false);
    };
    init();
  }, [supabase, router, fetchRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    setSubmitting(true);
    setMessage(null);

    const { error } = await supabase.from("service_requests").insert({
      customer_id:    customerId,
      service_type:   form.service_type,
      preferred_date: form.preferred_date || null,
      notes:          form.notes          || null,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Request submitted! Our team will review it shortly." });
      setForm({ service_type: SERVICE_TYPES[0], preferred_date: "", notes: "" });
      setShowForm(false);
      await fetchRequests(customerId);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">

        {/* Header */}
        <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <ServiceOSBrand subtitle="Customer Portal" />
              <Link href="/customer-portal" className="mt-4 flex items-center gap-1 text-sm text-blue-600 hover:underline">
                ← Back to dashboard
              </Link>
            </div>
            <div className="flex gap-2">
              <Link href="/customer-portal/invoices" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                Invoices
              </Link>
              <button
                type="button"
                onClick={async () => { await supabase.auth.signOut(); router.replace("/customer-auth"); }}
                className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Title + action */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Request Service</h1>
            <p className="text-sm text-slate-500">Submit a new cleaning service request</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            {showForm ? "Cancel" : "+ New Request"}
          </button>
        </div>

        {/* Request form */}
        {showForm && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">New Service Request</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Service Type</label>
                <select
                  value={form.service_type}
                  onChange={(e) => setForm((p) => ({ ...p, service_type: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {SERVICE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Preferred Date <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={form.preferred_date}
                  onChange={(e) => setForm((p) => ({ ...p, preferred_date: e.target.value }))}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Additional Notes <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  placeholder="Any specific requirements, areas of focus, access instructions…"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Messages */}
        {message && (
          <div className={`rounded-xl px-4 py-3 text-sm border ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {/* Past requests */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Your Requests</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-slate-500">No service requests yet. Submit your first one above.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{req.service_type}</p>
                      {req.preferred_date && (
                        <p className="mt-0.5 text-sm text-slate-500">
                          Preferred: {new Date(`${req.preferred_date}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                      {req.notes && <p className="mt-1 text-sm text-slate-600">{req.notes}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[req.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Submitted {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
