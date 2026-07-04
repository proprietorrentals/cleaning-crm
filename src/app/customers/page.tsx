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

type CustomerFormState = {
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  building_size: string;
  cleaning_frequency: string;
  notes: string;
};

const emptyForm: CustomerFormState = {
  company_name: "",
  contact_name: "",
  phone: "",
  email: "",
  address: "",
  building_size: "",
  cleaning_frequency: "",
  notes: "",
};

const formFields: Array<{
  key: keyof CustomerFormState;
  label: string;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
}> = [
  { key: "company_name", label: "Company Name", placeholder: "Northwind Cleaning" },
  { key: "contact_name", label: "Contact Name", placeholder: "Jordan Smith" },
  { key: "phone", label: "Phone", type: "tel", placeholder: "(555) 123-4567" },
  { key: "email", label: "Email", type: "email", placeholder: "jordan@northwind.com" },
  { key: "address", label: "Address", placeholder: "123 Market St" },
  { key: "building_size", label: "Building Size", placeholder: "20,000 sq ft" },
  { key: "cleaning_frequency", label: "Cleaning Frequency", placeholder: "Daily / Weekly / Monthly" },
];

export default function CustomersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setCustomers(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [supabase]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) => {
      return [
        customer.company_name,
        customer.contact_name,
        customer.email,
        customer.phone,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [customers, search]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      ...form,
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim(),
    };

    if (!payload.company_name || !payload.contact_name || !payload.email) {
      setMessage("Company name, contact name, and email are required.");
      setSaving(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase.from("customers").update(payload).eq("id", editingId);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("customers").insert(payload);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    }

    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
    await fetchCustomers();
    setMessage(editingId ? "Customer updated successfully." : "Customer added successfully.");
  };

  const handleEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({
      company_name: customer.company_name,
      contact_name: customer.contact_name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      building_size: customer.building_size,
      cleaning_frequency: customer.cleaning_frequency,
      notes: customer.notes,
    });
    setMessage("Editing customer details.");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Customer removed.");
    await fetchCustomers();
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
            <p className="text-sm font-medium text-blue-600">Customer management</p>
            <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent outline-none sm:w-56"
                placeholder="Search customers"
                aria-label="Search customers"
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

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Customer list</h2>
                <p className="text-sm text-slate-500">
                  {filteredCustomers.length} matching records
                </p>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Loading customers...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No customers found. Add your first one from the form.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{customer.company_name}</p>
                      <p className="text-sm text-slate-500">{customer.contact_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{customer.email}</p>
                      <p className="mt-1 text-sm text-slate-500">{customer.phone}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(customer)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(customer.id)}
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
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? "Edit customer" : "Add customer"}
                </h2>
                <p className="text-sm text-slate-500">
                  {editingId
                    ? "Update the customer profile below."
                    : "Create a new customer profile in seconds."}
                </p>
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm font-medium text-blue-600"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {formFields.map((field) => (
                <div key={field.key}>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {field.label}
                  </label>
                  {field.textarea ? (
                    <textarea
                      value={form[field.key]}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      type={field.type ?? "text"}
                      value={form[field.key]}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="Special instructions, access notes, or service preferences"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {saving ? "Saving..." : editingId ? "Save changes" : "Add customer"}
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
