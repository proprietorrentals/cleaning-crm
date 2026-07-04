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

type Job = {
  id: string;
  quote_id: string;
  client_name: string;
  contact_name: string;
  assigned_employee: string;
  cleaning_date: string;
  status: string;
  notes: string;
  created_at: string;
};

type JobFormState = {
  quote_id: string;
  client_name: string;
  contact_name: string;
  assigned_employee: string;
  cleaning_date: string;
  status: string;
  notes: string;
};

const emptyForm: JobFormState = {
  quote_id: "",
  client_name: "",
  contact_name: "",
  assigned_employee: "",
  cleaning_date: "",
  status: "Scheduled",
  notes: "",
};

export default function JobsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [form, setForm] = useState<JobFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);

    const [jobsResponse, quotesResponse] = await Promise.all([
      supabase.from("jobs").select("*").order("cleaning_date", { ascending: true }),
      supabase.from("quotes").select("*").order("created_at", { ascending: false }),
    ]);

    if (jobsResponse.error) {
      setMessage(jobsResponse.error.message);
    } else {
      setJobs(jobsResponse.data ?? []);
    }

    if (quotesResponse.error) {
      setMessage((current) => current ?? quotesResponse.error?.message ?? null);
    } else {
      setQuotes(quotesResponse.data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!form.client_name || !form.contact_name || !form.assigned_employee || !form.cleaning_date) {
      setMessage("Please complete the client, contact, employee, and date fields.");
      setSaving(false);
      return;
    }

    const payload = {
      quote_id: form.quote_id || null,
      client_name: form.client_name.trim(),
      contact_name: form.contact_name.trim(),
      assigned_employee: form.assigned_employee.trim(),
      cleaning_date: form.cleaning_date,
      status: form.status,
      notes: form.notes.trim(),
    };

    if (editingId) {
      const { error } = await supabase.from("jobs").update(payload).eq("id", editingId);
      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("jobs").insert(payload);
      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    }

    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
    await fetchData();
    setMessage(editingId ? "Job updated successfully." : "Job scheduled successfully.");
  };

  const handleEdit = (job: Job) => {
    setEditingId(job.id);
    setForm({
      quote_id: job.quote_id ?? "",
      client_name: job.client_name,
      contact_name: job.contact_name,
      assigned_employee: job.assigned_employee,
      cleaning_date: job.cleaning_date,
      status: job.status,
      notes: job.notes,
    });
    setMessage("Editing scheduled job.");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Job removed.");
    await fetchData();
  };

  const createFromQuote = (quote: Quote) => {
    setForm({
      quote_id: quote.id,
      client_name: quote.client_name,
      contact_name: quote.contact_name,
      assigned_employee: "",
      cleaning_date: "",
      status: "Scheduled",
      notes: quote.notes,
    });
    setEditingId(null);
    setMessage(`Quote for ${quote.client_name} loaded into the job form.`);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Job scheduling</p>
            <h1 className="text-2xl font-semibold text-slate-900">Jobs</h1>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to dashboard
          </Link>
        </header>

        {message ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Convert quotes to jobs</h2>
            <p className="mt-1 text-sm text-slate-500">Use a saved quote to create a scheduled cleaning visit.</p>

            <div className="mt-4 space-y-3">
              {quotes.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No saved quotes yet. Create one first in the quote generator.</div>
              ) : (
                quotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{quote.client_name}</p>
                      <p className="text-sm text-slate-500">{quote.contact_name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => createFromQuote(quote)}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                      Create job
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Job details</h2>
                <p className="text-sm text-slate-500">Track cleaning status, employee assignments, and date.</p>
              </div>
              {editingId ? (
                <button type="button" onClick={resetForm} className="text-sm font-medium text-blue-600">
                  Clear
                </button>
              ) : null}
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
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Assigned employee</label>
                  <input
                    value={form.assigned_employee}
                    onChange={(event) => setForm((current) => ({ ...current, assigned_employee: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="Mina Patel"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Cleaning date</label>
                  <input
                    type="date"
                    value={form.cleaning_date}
                    onChange={(event) => setForm((current) => ({ ...current, cleaning_date: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="Access instructions or special requirements"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {saving ? "Saving..." : editingId ? "Update job" : "Schedule job"}
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
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Scheduled jobs</h2>
          {loading ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No jobs scheduled yet.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{job.client_name}</p>
                    <p className="text-sm text-slate-500">{job.contact_name}</p>
                    <p className="mt-1 text-sm text-slate-500">Assigned to {job.assigned_employee}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">{job.status}</span>
                    <span className="text-sm text-slate-500">{job.cleaning_date}</span>
                    <button
                      type="button"
                      onClick={() => handleEdit(job)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(job.id)}
                      className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
