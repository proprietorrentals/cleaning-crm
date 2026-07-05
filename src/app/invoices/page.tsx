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

type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string;
  job_id: string;
  amount: number;
  due_date: string;
  status: string;
  notes: string;
  created_at: string;
};

type InvoiceFormState = {
  job_id: string;
  customer_id: string;
  invoice_number: string;
  amount: string;
  status: string;
  due_date: string;
  notes: string;
};

const emptyForm: InvoiceFormState = {
  job_id: "",
  customer_id: "",
  invoice_number: "",
  amount: "",
  status: "Pending",
  due_date: "",
  notes: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `INV-${year}${month}${day}-${random}`;
}

export default function InvoicesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<InvoiceFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);

    const [invoicesResponse, jobsResponse, customersResponse] = await Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("jobs").select("*").eq("status", "Completed").order("scheduled_date", { ascending: false }),
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
    ]);

    if (invoicesResponse.error) {
      console.error("Failed to fetch invoices:", invoicesResponse.error);
      setMessage(invoicesResponse.error.message);
    } else {
      setInvoices(invoicesResponse.data ?? []);
    }

    if (jobsResponse.error) {
      console.error("Failed to fetch jobs:", jobsResponse.error);
    } else {
      setJobs(jobsResponse.data ?? []);
    }

    if (customersResponse.error) {
      console.error("Failed to fetch customers:", customersResponse.error);
    } else {
      setCustomers(customersResponse.data ?? []);
    }

    setLoading(false);
    setJobsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return invoices;
    }

    return invoices.filter((invoice) => {
      const customer = customers.find((c) => c.id === invoice.customer_id);
      const customerName = customer?.company_name || "";
      return [invoice.invoice_number, customerName, invoice.status]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [invoices, search, customers]);

  const handleJobSelect = (jobId: string) => {
    const selected = jobs.find((j) => j.id === jobId);
    if (selected) {
      const customer = customers.find((c) => c.id === selected.customer_id);
      setForm((current) => ({
        ...current,
        job_id: jobId,
        customer_id: selected.customer_id,
        amount: String(selected.estimated_value),
        invoice_number: generateInvoiceNumber(),
        due_date: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: selected.notes || "",
      }));
    } else {
      setForm(emptyForm);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!form.job_id || !form.invoice_number || !form.amount) {
      setMessage("Please select a job, enter invoice number and amount.");
      setSaving(false);
      return;
    }

    const payload = {
      job_id: form.job_id,
      customer_id: form.customer_id,
      invoice_number: form.invoice_number.trim(),
      amount: Number(form.amount),
      status: form.status,
      due_date: form.due_date,
      notes: form.notes.trim(),
    };

    if (editingId) {
      const { error } = await supabase.from("invoices").update(payload).eq("id", editingId);
      if (error) {
        console.error("Update error:", error);
        setMessage(`Error updating invoice: ${error.message}`);
        setSaving(false);
        return;
      }
      setMessage("Invoice updated successfully.");
    } else {
      const { error } = await supabase.from("invoices").insert(payload);
      if (error) {
        console.error("Insert error:", error);
        setMessage(`Error creating invoice: ${error.message}`);
        setSaving(false);
        return;
      }
      setMessage("Invoice created successfully.");
    }

    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
    await fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error);
      setMessage(`Error deleting invoice: ${error.message}`);
      return;
    }

    setMessage("Invoice deleted successfully.");
    await fetchData();
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingId(invoice.id);
    const job = jobs.find((j) => j.id === invoice.job_id);
    setForm({
      job_id: invoice.job_id,
      customer_id: invoice.customer_id,
      invoice_number: invoice.invoice_number,
      amount: String(invoice.amount),
      status: invoice.status,
      due_date: invoice.due_date,
      notes: invoice.notes,
    });
    setMessage("Editing invoice record.");
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
            <p className="text-sm font-medium text-blue-600">Billing</p>
            <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent outline-none sm:w-56"
                placeholder="Search invoices"
                aria-label="Search invoices"
              />
            </label>
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
                <h2 className="text-lg font-semibold text-slate-900">Invoice list</h2>
                <p className="text-sm text-slate-500">{filteredInvoices.length} matching records</p>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading invoices...</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No invoices found.</div>
            ) : (
              <div className="mt-6 space-y-3">
                {filteredInvoices.map((invoice) => {
                  const customer = customers.find((c) => c.id === invoice.customer_id);
                  const job = jobs.find((j) => j.id === invoice.job_id);
                  return (
                    <div key={invoice.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
                        <p className="text-sm text-slate-500">{customer?.company_name || "Unknown"}</p>
                        <p className="mt-1 text-sm text-slate-600">Job: {job?.scheduled_date || "N/A"}</p>
                        <p className="text-lg font-semibold text-slate-900 mt-2">{formatCurrency(invoice.amount)}</p>
                        <p className="text-sm text-slate-500">Due {invoice.due_date}</p>
                        <p className={`text-sm font-medium mt-1 ${invoice.status === "Paid" ? "text-green-600" : invoice.status === "Overdue" ? "text-red-600" : "text-yellow-600"}`}>
                          {invoice.status}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(invoice)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(invoice.id)}
                        className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit invoice" : "Add invoice"}</h2>
                <p className="text-sm text-slate-500">
                  {editingId ? "Update the invoice below." : "Create a new invoice entry."}
                </p>
              </div>
              {editingId ? (
                <button type="button" onClick={resetForm} className="text-sm font-medium text-blue-600">
                  Cancel
                </button>
              ) : null}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Select a completed job</label>
                <select
                  value={form.job_id}
                  onChange={(event) => handleJobSelect(event.target.value)}
                  disabled={jobsLoading}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{jobsLoading ? "Loading jobs..." : jobs.length === 0 ? "No completed jobs available" : "Choose a job..."}</option>
                  {jobs.map((job) => {
                    const customer = customers.find((c) => c.id === job.customer_id);
                    return (
                      <option key={job.id} value={job.id}>
                        {customer?.company_name || "Unknown"} - {job.scheduled_date} ({formatCurrency(job.estimated_value)})
                      </option>
                    );
                  })}
                </select>
              </div>

              {form.job_id ? (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600">Customer</label>
                      <p className="text-sm text-slate-900 font-medium">{customers.find((c) => c.id === form.customer_id)?.company_name || "Unknown"}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600">Job Date</label>
                      <p className="text-sm text-slate-900">{jobs.find((j) => j.id === form.job_id)?.scheduled_date || "N/A"}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Invoice number</label>
                  <input
                    value={form.invoice_number}
                    onChange={(event) => setForm((current) => ({ ...current, invoice_number: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="INV-20260704-0001"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="4200"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Due date</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="Payment terms, service notes, or additional information"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add invoice"}
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
      </div>
    </div>
  );
}
