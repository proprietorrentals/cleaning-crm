"use client";

import { createClient } from "@/lib/supabase/client";
import { InvoicePDF } from "@/lib/invoice-pdf";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { pdf } from "@react-pdf/renderer";

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
    setJobsLoading(true);
    setMessage(null);

    console.log("📋 DEBUG - Starting fetchData for invoice creation page");
    console.log("🔍 Time:", new Date().toISOString());

    // Query 1: Fetch ALL jobs without any filter (to see raw state)
    console.log("📋 DEBUG - Query 1: Fetching ALL jobs from public.jobs");
    console.log("  Exact query: supabase.from('jobs').select('*')");
    const allJobsResponse = await supabase
      .from("jobs")
      .select("*");

    console.log("✅ Query 1 Complete - Raw Response:");
    console.log("  Total rows returned:", allJobsResponse.data?.length ?? 0);
    console.log("  Status code:", allJobsResponse.status);
    console.log("  Error:", allJobsResponse.error);
    if (allJobsResponse.data && allJobsResponse.data.length > 0) {
      console.log("  Raw Data:", allJobsResponse.data);
      console.log("  Detailed breakdown:");
      allJobsResponse.data.forEach((job: any, idx: number) => {
        console.log(`    [${idx}] id=${job.id}, status="${job.status}", customer_id=${job.customer_id}, quote_id=${job.quote_id}, estimated_value=${job.estimated_value}`);
      });
    }

    // Query 2: Fetch ONLY jobs with status = "Completed" (exact match, capital C)
    console.log("📋 DEBUG - Query 2: Fetching ONLY status='Completed' jobs");
    console.log("  Exact query: supabase.from('jobs').select('*').eq('status', 'Completed')");
    const completedJobsResponse = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "Completed");

    console.log("✅ Query 2 Complete - Raw Response:");
    console.log("  Total rows returned:", completedJobsResponse.data?.length ?? 0);
    console.log("  Status code:", completedJobsResponse.status);
    console.log("  Error:", completedJobsResponse.error);
    if (completedJobsResponse.data && completedJobsResponse.data.length > 0) {
      console.log("  Raw Data:", completedJobsResponse.data);
      console.log("  Detailed breakdown:");
      completedJobsResponse.data.forEach((job: any, idx: number) => {
        console.log(`    [${idx}] id=${job.id}, status="${job.status}", customer_id=${job.customer_id}, quote_id=${job.quote_id}, estimated_value=${job.estimated_value}`);
      });
    }

    // Fetch invoices and customers in parallel
    const [invoicesResponse, customersResponse] = await Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
    ]);

    if (invoicesResponse.error) {
      console.error("❌ Failed to fetch invoices:", {
        message: invoicesResponse.error.message,
        code: invoicesResponse.error.code,
        details: invoicesResponse.error.details,
      });
      setMessage(`❌ Error fetching invoices: ${invoicesResponse.error.message}`);
    } else {
      setInvoices(invoicesResponse.data ?? []);
      console.log(`✓ Fetched ${invoicesResponse.data?.length ?? 0} invoices`);
    }

    // Use Query 2 results (completed jobs with capital C)
    if (completedJobsResponse.error) {
      console.error("❌ SUPABASE ERROR - Failed to fetch completed jobs:", {
        message: completedJobsResponse.error.message,
        code: completedJobsResponse.error.code,
        details: completedJobsResponse.error.details,
        hint: completedJobsResponse.error.hint,
      });
      setMessage(`❌ Supabase Error: ${completedJobsResponse.error.message} (Code: ${completedJobsResponse.error.code})`);
      setJobs([]);
    } else {
      const completedJobs = completedJobsResponse.data ?? [];
      console.log(`✓ Successfully fetched ${completedJobs.length} jobs with status="Completed"`);
      setJobs(completedJobs);
    }

    if (customersResponse.error) {
      console.error("❌ Failed to fetch customers:", {
        message: customersResponse.error.message,
        code: customersResponse.error.code,
        details: customersResponse.error.details,
      });
      setMessage(`❌ Error fetching customers: ${customersResponse.error.message}`);
    } else {
      setCustomers(customersResponse.data ?? []);
      console.log(`✓ Fetched ${customersResponse.data?.length ?? 0} customers`);
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
    console.log("📋 DEBUG - Job selected:", jobId);
    console.log("📋 DEBUG - Selected job object:", selected);
    console.log("📋 DEBUG - Selected job status:", selected?.status, "| Type:", typeof selected?.status);
    console.log("📋 DEBUG - Is status === 'Completed'?", selected?.status === "Completed");
    
    if (selected) {
      const customer = customers.find((c) => c.id === selected.customer_id);
      console.log("📋 DEBUG - Found customer for job:", customer?.company_name, "| ID:", selected.customer_id);
      
      const dueDate = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const invoiceNum = generateInvoiceNumber();
      
      console.log("📋 DEBUG - Setting form with:", {
        job_id: jobId,
        customer_id: selected.customer_id,
        amount: String(selected.estimated_value),
        invoice_number: invoiceNum,
        due_date: dueDate,
        job_status: selected.status,
      });
      
      setForm((current) => ({
        ...current,
        job_id: jobId,
        customer_id: selected.customer_id,
        amount: String(selected.estimated_value),
        invoice_number: invoiceNum,
        due_date: dueDate,
        notes: selected.notes || "",
      }));
    } else {
      console.error("❌ Job not found:", jobId);
      setForm(emptyForm);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    console.log("📋 DEBUG - Starting invoice submission");

    // Validate all required fields
    if (!form.job_id) {
      setMessage("❌ Please select a job.");
      setSaving(false);
      return;
    }

    if (!form.customer_id) {
      setMessage("❌ Customer ID is missing.");
      setSaving(false);
      return;
    }

    if (!form.invoice_number) {
      setMessage("❌ Please enter an invoice number.");
      setSaving(false);
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setMessage("❌ Please enter a valid amount.");
      setSaving(false);
      return;
    }

    if (!form.due_date) {
      setMessage("❌ Please enter a due date.");
      setSaving(false);
      return;
    }

    if (!form.status) {
      setMessage("❌ Please select a status.");
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

    console.log("📋 DEBUG - Invoice payload to be saved:", payload);
    console.log("📋 DEBUG - Payload field types:", {
      job_id: typeof payload.job_id,
      customer_id: typeof payload.customer_id,
      invoice_number: typeof payload.invoice_number,
      amount: typeof payload.amount,
      status: typeof payload.status,
      due_date: typeof payload.due_date,
    });

    if (editingId) {
      console.log("📋 DEBUG - Updating existing invoice:", editingId);
      const { data: updateData, error: updateError } = await supabase
        .from("invoices")
        .update(payload)
        .eq("id", editingId)
        .select();

      if (updateError) {
        console.error("❌ Update error:", {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
        });
        setMessage(`❌ Error updating invoice: ${updateError.message}`);
        setSaving(false);
        return;
      }

      console.log("✓ Invoice updated successfully:", updateData);
      setMessage("✓ Invoice updated successfully.");
    } else {
      console.log("📋 DEBUG - Creating new invoice");
      const { data: insertData, error: insertError } = await supabase
        .from("invoices")
        .insert(payload)
        .select();

      if (insertError) {
        console.error("❌ Insert error:", {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
        });
        setMessage(`❌ Error creating invoice: ${insertError.message}`);
        setSaving(false);
        return;
      }

      if (!insertData || insertData.length === 0) {
        console.error("❌ Insert returned no data");
        setMessage("❌ Invoice created but no data returned. Please refresh.");
        setSaving(false);
        return;
      }

      console.log("✓ Invoice created successfully:", insertData[0].id);
      setMessage(`✓ Invoice created successfully: ${insertData[0].invoice_number}`);
    }

    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
    console.log("📋 DEBUG - Refreshing data after invoice save");
    await fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      console.error("❌ Delete error:", {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      setMessage(`❌ Error deleting invoice: ${error.message}`);
      return;
    }

    console.log("✓ Invoice deleted successfully");
    setMessage("✓ Invoice deleted successfully.");
    await fetchData();
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      console.log("📄 DEBUG - Generating PDF for invoice:", invoice.invoice_number);
      const customer = customers.find((c) => c.id === invoice.customer_id);
      const job = jobs.find((j) => j.id === invoice.job_id);

      const doc = <InvoicePDF invoice={invoice} customer={customer} job={job} />;
      const blob = await pdf(doc).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`✓ Downloaded invoice ${invoice.invoice_number}`);
    } catch (error) {
      console.error("❌ PDF generation error:", error);
      setMessage(`❌ Error generating invoice PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    console.log("📋 DEBUG - Editing invoice:", invoice.id);
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
    console.log("📋 DEBUG - Resetting invoice form");
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

        {/* DEBUG SUMMARY PANEL */}
        <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-4">
          <p className="mb-2 text-sm font-semibold text-purple-900">🔍 Database Status Summary:</p>
          <div className="space-y-1 font-mono text-xs text-purple-800">
            <p>📊 Total Customers in DB: <strong>{customers.length}</strong></p>
            <p>✓ Jobs with status="Completed": <strong className="text-green-700">{jobs.length}</strong></p>
            <p>📋 Invoice Numbers Format: INV-YYYYMMDD-XXXX</p>
            <p>📝 Required Fields: job_id, customer_id, invoice_number, amount, due_date</p>
            <p>🔎 Check browser console for detailed query logs and status value comparison</p>
          </div>
        </div>

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
                          onClick={() => handleDownloadPDF(invoice)}
                          className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100"
                        >
                          ⬇ PDF
                        </button>
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
              {/* DISPLAY RAW QUERY RESULTS FROM SUPABASE */}
              <div className="rounded-2xl border-2 border-purple-300 bg-purple-50 p-4">
                <p className="mb-2 text-sm font-semibold text-purple-900">
                  🔍 RAW SUPABASE QUERY RESULTS
                </p>
                
                <div className="mb-3 rounded-lg border-l-4 border-purple-500 bg-white p-3">
                  <p className="text-xs font-mono text-purple-900">
                    <strong>Exact Query:</strong>
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-700">
                    supabase.from('jobs').select('*').eq('status', 'Completed')
                  </p>
                </div>

                <div className="rounded-lg border-l-4 border-purple-500 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold text-purple-900">
                    📊 Total rows returned: <span className="text-lg font-bold text-blue-600">{jobs.length}</span>
                  </p>
                  
                  {jobs.length === 0 ? (
                    <div className="text-xs text-red-700">
                      <p>❌ No jobs returned from query</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100">
                            <th className="px-2 py-1 text-left">id</th>
                            <th className="px-2 py-1 text-left">status</th>
                            <th className="px-2 py-1 text-left">customer_id</th>
                            <th className="px-2 py-1 text-left">quote_id</th>
                            <th className="px-2 py-1 text-right">estimated_value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobs.map((job, idx) => (
                            <tr key={job.id} className="border-b border-slate-100 hover:bg-blue-50">
                              <td className="px-2 py-1 text-slate-900">{job.id}</td>
                              <td className="px-2 py-1">
                                <span className="inline-block rounded bg-green-100 px-2 py-0.5 text-green-900">
                                  {job.status}
                                </span>
                              </td>
                              <td className="px-2 py-1 text-slate-900">{job.customer_id}</td>
                              <td className="px-2 py-1 text-slate-900">{job.quote_id || "null"}</td>
                              <td className="px-2 py-1 text-right text-slate-900">${job.estimated_value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Select a job for invoice</label>
                <select
                  value={form.job_id}
                  onChange={(event) => handleJobSelect(event.target.value)}
                  disabled={jobsLoading || jobs.length === 0}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">{jobsLoading ? "Loading jobs..." : jobs.length === 0 ? "No completed jobs available" : "Choose a completed job..."}</option>
                  {jobs.map((job) => {
                    const customer = customers.find((c) => c.id === job.customer_id);
                    return (
                      <option key={job.id} value={job.id}>
                        {customer?.company_name || `Customer ${job.customer_id}`} - {job.scheduled_date} (${job.estimated_value})
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
