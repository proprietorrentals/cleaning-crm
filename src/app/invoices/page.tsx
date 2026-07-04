"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Invoice = {
  id: string;
  customer_name: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  notes: string;
  created_at: string;
};

type InvoiceFormState = {
  customer_name: string;
  invoice_number: string;
  amount: string;
  status: string;
  due_date: string;
  notes: string;
};

const emptyForm: InvoiceFormState = {
  customer_name: "",
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

export default function InvoicesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<InvoiceFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setInvoices(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [supabase]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return invoices;
    }

    return invoices.filter((invoice) =>
      [invoice.customer_name, invoice.invoice_number, invoice.status]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [invoices, search]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      customer_name: form.customer_name.trim(),
      invoice_number: form.invoice_number.trim(),
      amount: Number(form.amount),
      status: form.status,
      due_date: form.due_date,
      notes: form.notes.trim(),
    };

    if (!payload.customer_name || !payload.invoice_number || !payload.amount) {
      setMessage("Customer name, invoice number, and amount are required.");
      setSaving(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase.from("invoices").update(payload).eq("id", editingId);
      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("invoices").insert(payload);
      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    }

    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
    await fetchInvoices();
    setMessage(editingId ? "Invoice updated successfully." : "Invoice added successfully.");
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingId(invoice.id);
    setForm({
      customer_name: invoice.customer_name,
      invoice_number: invoice.invoice_number,
      amount: String(invoice.amount),
      status: invoice.status,
      due_date: invoice.due_date,
      notes: invoice.notes,
    });
    setMessage("Editing invoice record.");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Invoice removed.");
    await fetchInvoices();
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
                {filteredInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-slate-500">{invoice.customer_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatCurrency(invoice.amount)}</p>
                      <p className="mt-1 text-sm text-slate-500">Due {invoice.due_date}</p>
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
                ))}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Customer name</label>
                  <input
                    value={form.customer_name}
                    onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="Acme Properties"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Invoice number</label>
                  <input
                    value={form.invoice_number}
                    onChange={(event) => setForm((current) => ({ ...current, invoice_number: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="INV-1001"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="4200"
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
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Due date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="Payment terms or service notes"
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
