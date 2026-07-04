"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Quote = {
  id: string;
  client_name: string;
  contact_name: string;
  email: string;
  square_footage: number;
  cleaning_frequency: string;
  extra_services: string[];
  notes: string;
  total_estimate: number;
  created_at: string;
};

type QuoteFormState = {
  client_name: string;
  contact_name: string;
  email: string;
  square_footage: string;
  cleaning_frequency: string;
  extra_services: string[];
  notes: string;
};

const emptyForm: QuoteFormState = {
  client_name: "",
  contact_name: "",
  email: "",
  square_footage: "",
  cleaning_frequency: "daily",
  extra_services: [],
  notes: "",
};

const frequencyRates: Record<string, number> = {
  daily: 0.14,
  weekly: 0.12,
  monthly: 0.09,
  one_time: 0.16,
};

const extraServiceRates: Record<string, number> = {
  window_cleaning: 180,
  carpet_shampoo: 220,
  restroom_sanitation: 95,
  floor_waxing: 150,
};

const extraServiceLabels: Record<string, string> = {
  window_cleaning: "Window Cleaning",
  carpet_shampoo: "Carpet Shampoo",
  restroom_sanitation: "Restroom Sanitation",
  floor_waxing: "Floor Waxing",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateEstimate(value: QuoteFormState) {
  const squareFootage = Number(value.square_footage) || 0;
  const rate = frequencyRates[value.cleaning_frequency] ?? frequencyRates.daily;
  const base = squareFootage * rate;
  const extra = value.extra_services.reduce(
    (sum, service) => sum + (extraServiceRates[service] ?? 0),
    0,
  );

  return Number((base + extra).toFixed(2));
}

export default function QuotesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [form, setForm] = useState<QuoteFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);

  const estimate = useMemo(() => calculateEstimate(form), [form]);

  const fetchQuotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setQuotes(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchQuotes();
  }, [supabase]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!form.client_name || !form.contact_name || !form.email || !form.square_footage) {
      setMessage("Please complete the client name, contact, email, and square footage fields.");
      setSaving(false);
      return;
    }

    const payload = {
      client_name: form.client_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
      square_footage: Number(form.square_footage),
      cleaning_frequency: form.cleaning_frequency,
      extra_services: form.extra_services,
      notes: form.notes.trim(),
      total_estimate: estimate,
    };

    if (editingId) {
      const { error } = await supabase.from("quotes").update(payload).eq("id", editingId);
      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
      setMessage("Quote updated successfully.");
    } else {
      const { error } = await supabase.from("quotes").insert(payload);
      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
      setMessage("Quote saved successfully.");
    }

    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
    await fetchQuotes();
  };

  const handleEdit = (quote: Quote) => {
    setEditingId(quote.id);
    setForm({
      client_name: quote.client_name,
      contact_name: quote.contact_name,
      email: quote.email,
      square_footage: String(quote.square_footage),
      cleaning_frequency: quote.cleaning_frequency,
      extra_services: quote.extra_services,
      notes: quote.notes,
    });
    setActiveQuote(quote);
    setMessage("Editing saved quote.");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("quotes").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Quote deleted.");
    await fetchQuotes();
    if (activeQuote?.id === id) {
      setActiveQuote(null);
    }
  };

  const handlePrint = (quote: Quote) => {
    setActiveQuote(quote);
    window.print();
  };

  const handleEmail = (quote: Quote) => {
    const subject = encodeURIComponent(`Cleaning estimate for ${quote.client_name}`);
    const body = encodeURIComponent(
      `Hello ${quote.contact_name},\n\nHere is your commercial cleaning estimate for ${quote.client_name}:\n- Square footage: ${quote.square_footage}\n- Frequency: ${quote.cleaning_frequency}\n- Estimated total: ${formatCurrency(quote.total_estimate)}\n\nThanks,\nCleaning CRM`,
    );
    window.location.href = `mailto:${quote.email}?subject=${subject}&body=${body}`;
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage(null);
  };

  const toggleService = (service: string) => {
    setForm((current) => ({
      ...current,
      extra_services: current.extra_services.includes(service)
        ? current.extra_services.filter((item) => item !== service)
        : [...current.extra_services, service],
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Quote generator</p>
            <h1 className="text-2xl font-semibold text-slate-900">Commercial cleaning estimates</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Back to dashboard
            </Link>
          </div>
        </header>

        {message ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Build a quote</h2>
                <p className="text-sm text-slate-500">
                  Estimate pricing from square footage, frequency, and add-ons.
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                {formatCurrency(estimate)}
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Client name</label>
                  <input
                    value={form.client_name}
                    onChange={(event) => setForm((current) => ({ ...current, client_name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="Acme Properties"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Contact name</label>
                  <input
                    value={form.contact_name}
                    onChange={(event) => setForm((current) => ({ ...current, contact_name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="Jamie Rivera"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="jamie@acme.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Square footage</label>
                  <input
                    type="number"
                    min="0"
                    value={form.square_footage}
                    onChange={(event) => setForm((current) => ({ ...current, square_footage: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="25000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Cleaning frequency</label>
                <select
                  value={form.cleaning_frequency}
                  onChange={(event) => setForm((current) => ({ ...current, cleaning_frequency: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Extra services</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(extraServiceLabels).map(([service, label]) => (
                    <label key={service} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.extra_services.includes(service)}
                        onChange={() => toggleService(service)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="Special requirements, access instructions, or service notes"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {saving ? "Saving..." : editingId ? "Update quote" : "Save quote"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Clear
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Quote preview</h2>
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Estimated total</span>
                  <span className="text-2xl font-semibold text-slate-900">{formatCurrency(estimate)}</span>
                </div>
                <p className="text-sm text-slate-600">
                  Based on {form.square_footage || 0} sq ft at {form.cleaning_frequency} frequency.
                </p>
                {form.extra_services.length > 0 ? (
                  <div className="text-sm text-slate-600">
                    <p className="font-medium">Selected add-ons</p>
                    <ul className="mt-1 list-disc pl-5">
                      {form.extra_services.map((service) => (
                        <li key={service}>{extraServiceLabels[service]}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Saved quotes</h2>
                  <p className="text-sm text-slate-500">Manage and send your estimates.</p>
                </div>
              </div>

              {loading ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading quotes...</div>
              ) : quotes.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No quotes saved yet.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {quotes.map((quote) => (
                    <div key={quote.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{quote.client_name}</p>
                          <p className="text-sm text-slate-500">{quote.contact_name}</p>
                          <p className="mt-1 text-sm text-slate-500">{formatCurrency(quote.total_estimate)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(quote)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(quote)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                          >
                            Print
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEmail(quote)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                          >
                            Email
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(quote.id)}
                            className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
