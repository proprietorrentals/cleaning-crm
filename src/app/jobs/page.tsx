"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Customer = {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  building_size: string;
  cleaning_frequency: string;
  notes: string;
  created_at: string;
};

type Quote = {
  id: string;
  customer_id: string;
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
  customer_id: string;
  scheduled_date: string;
  assigned_employee: string | null;
  status: string;
  estimated_value: number;
  notes: string;
  created_at: string;
};

type JobFormState = {
  quote_id: string;
  customer_id: string;
  scheduled_date: string;
  assigned_employee: string;
  status: string;
  estimated_value: string;
  notes: string;
};

const emptyForm: JobFormState = {
  quote_id: "",
  customer_id: "",
  scheduled_date: "",
  assigned_employee: "",
  status: "Scheduled",
  estimated_value: "",
  notes: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function JobsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [form, setForm] = useState<JobFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setMessage(null);

    const [jobsResponse, customersResponse, quotesResponse] = await Promise.all([
      supabase.from("jobs").select("*").order("scheduled_date", { ascending: true }),
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("quotes").select("*").order("created_at", { ascending: false }),
    ]);

    if (jobsResponse.error) {
      console.error("❌ Failed to fetch jobs:", jobsResponse.error);
      setMessage(`❌ Error fetching jobs: ${jobsResponse.error.message}`);
    } else {
      setJobs(jobsResponse.data ?? []);
      console.log(`✓ Fetched ${jobsResponse.data?.length ?? 0} jobs from public.jobs table`);
    }

    if (customersResponse.error) {
      console.error("❌ Failed to fetch customers:", customersResponse.error);
      setMessage((current) => current ? `${current}; Also failed to fetch customers: ${customersResponse.error.message}` : `❌ Error fetching customers: ${customersResponse.error.message}`);
    } else {
      setCustomers(customersResponse.data ?? []);
      console.log(`✓ Fetched ${customersResponse.data?.length ?? 0} customers`);
    }

    if (quotesResponse.error) {
      console.error("❌ Failed to fetch quotes:", quotesResponse.error);
      setMessage((current) => current ? `${current}; Also failed to fetch quotes: ${quotesResponse.error.message}` : `❌ Error fetching quotes: ${quotesResponse.error.message}`);
    } else {
      setQuotes(quotesResponse.data ?? []);
      console.log(`✓ Fetched ${quotesResponse.data?.length ?? 0} quotes`);
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

    if (!form.customer_id || !form.scheduled_date) {
      setMessage("❌ Please select a customer and scheduled date.");
      setSaving(false);
      return;
    }

    const payload = {
      quote_id: form.quote_id || null,
      customer_id: form.customer_id,
      scheduled_date: form.scheduled_date,
      assigned_employee: form.assigned_employee || null,
      status: form.status,
      estimated_value: Number(form.estimated_value) || 0,
      notes: form.notes.trim(),
    };

    if (editingId) {
      const { error } = await supabase.from("jobs").update(payload).eq("id", editingId);
      if (error) {
        console.error("Update error:", error);
        setMessage(`❌ Error updating job: ${error.message}`);
        setSaving(false);
        return;
      }
      setMessage("✓ Job updated successfully.");
    } else {
      const { error } = await supabase.from("jobs").insert(payload);
      if (error) {
        console.error("Insert error:", error);
        setMessage(`❌ Error creating job: ${error.message}`);
        setSaving(false);
        return;
      }
      setMessage("✓ Job scheduled successfully.");
    }

    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
    await fetchData();
  };

  const handleEdit = (job: Job) => {
    setEditingId(job.id);
    setForm({
      quote_id: job.quote_id || "",
      customer_id: job.customer_id,
      scheduled_date: job.scheduled_date,
      assigned_employee: job.assigned_employee || "",
      status: job.status,
      estimated_value: String(job.estimated_value),
      notes: job.notes || "",
    });
    setMessage("Editing scheduled job.");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error);
      setMessage(`❌ Error deleting job: ${error.message}`);
      return;
    }

    setMessage("✓ Job deleted successfully.");
    await fetchData();
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    const { error } = await supabase.from("jobs").update({ status: newStatus }).eq("id", jobId);
    if (error) {
      console.error("Status update error:", error);
      setMessage(`❌ Error updating job status: ${error.message}`);
      return;
    }

    setMessage(`✓ Job status changed to ${newStatus}.`);
    await fetchData();
  };

  const createFromQuote = (quote: Quote) => {
    const customer = customers.find((c) => c.id === quote.customer_id);
    setForm({
      quote_id: quote.id,
      customer_id: quote.customer_id,
      scheduled_date: new Date().toISOString().split("T")[0],
      assigned_employee: "",
      status: "Scheduled",
      estimated_value: String(quote.total_estimate),
      notes: quote.notes || "",
    });
    setEditingId(null);
    setMessage(`✓ Quote from ${customer?.company_name || "customer"} loaded into the job form.`);
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
            <h2 className="text-lg font-semibold text-slate-900">Available quotes</h2>
            <p className="mt-1 text-sm text-slate-500">Use a quote to pre-fill job information.</p>

            <div className="mt-4 space-y-3">
              {quotes.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No saved quotes yet. Create one in the Quotes page.</div>
              ) : (
                quotes.map((quote) => {
                  const customer = customers.find((c) => c.id === quote.customer_id);
                  return (
                    <div key={quote.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-900">{customer?.company_name || "Unknown"}</p>
                        <p className="text-sm text-slate-500">{quote.square_footage} sq ft • {formatCurrency(quote.total_estimate)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => createFromQuote(quote)}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                      >
                        Use quote
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Job details</h2>
                <p className="text-sm text-slate-500">Create and track cleaning job assignments.</p>
              </div>
              {editingId ? (
                <button type="button" onClick={resetForm} className="text-sm font-medium text-blue-600">
                  Clear
                </button>
              ) : null}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Customer</label>
                <select
                  value={form.customer_id}
                  onChange={(event) => setForm((current) => ({ ...current, customer_id: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="">Select a customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Scheduled date</label>
                  <input
                    type="date"
                    required
                    value={form.scheduled_date}
                    onChange={(event) => setForm((current) => ({ ...current, scheduled_date: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Assigned employee (optional)</label>
                  <input
                    value={form.assigned_employee}
                    onChange={(event) => setForm((current) => ({ ...current, assigned_employee: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="e.g., Mina Patel"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Estimated value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.estimated_value}
                    onChange={(event) => setForm((current) => ({ ...current, estimated_value: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="2500"
                  />
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">All jobs</h2>
              <p className="text-sm text-slate-500">{jobs.length} total jobs in system</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              ℹ️ No jobs found in database. Create jobs by approving quotes on the Quotes page.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Scheduled Date</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Employee</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">Value</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const customer = customers.find((c) => c.id === job.customer_id);
                    const statusColor =
                      job.status === "Completed"
                        ? "bg-green-50 text-green-700"
                        : job.status === "In Progress"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-blue-50 text-blue-700";

                    return (
                      <tr key={job.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{customer?.company_name || "Unknown"}</td>
                        <td className="px-4 py-3 text-slate-600">{job.scheduled_date}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{job.assigned_employee || "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(job.estimated_value)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {job.status !== "Completed" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(job.id, "Completed")}
                                className="rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-600 transition hover:bg-green-100"
                              >
                                ✓ Mark Complete
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEdit(job)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(job.id)}
                              className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
