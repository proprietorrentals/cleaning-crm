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

const supabaseClient = createClient();

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    company_name: "",
    contact_name: "",
    phone: "",
    email: "",
  });
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  const fetchCustomers = async (client: ReturnType<typeof createClient>) => {
    try {
      setLoading(true);
      
      // Debug: Check env on fetch too
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      console.log("fetchCustomers - URL check:", {
        urlSet: !!url && url !== "https://your-project-id.supabase.co",
        urlValue: url?.slice(0, 20),
      });
      
      const { data, error } = await client
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        let errorMsg = `Error loading customers: ${error.message}`;
        if (error.details) errorMsg += ` (${error.details})`;
        setMessage(errorMsg);
        setCustomers([]);
      } else {
        setCustomers(data ?? []);
      }
    } catch (err) {
      console.error("Catch error fetching customers:", err);
      const errorDetail = err instanceof Error ? err.message : String(err);
      setMessage(`Failed to load customers: ${errorDetail}`);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const load = async () => {
      if (isMounted) {
        await fetchCustomers(supabaseClient);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

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
      const { error } = await supabaseClient.from("customers").update(payload).eq("id", editingId);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabaseClient.from("customers").insert(payload);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    }

    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
    await fetchCustomers(supabaseClient);
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
    const { error } = await supabaseClient.from("customers").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Customer removed.");
    await fetchCustomers(supabaseClient);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage(null);
  };

  const handleModalSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setModalSaving(true);
    setModalMessage(null);

    console.log("Modal submit started with form:", { ...modalForm });

    const payload = {
      company_name: modalForm.company_name.trim(),
      contact_name: modalForm.contact_name.trim(),
      phone: modalForm.phone.trim(),
      email: modalForm.email.trim(),
      address: "",
      building_size: "",
      cleaning_frequency: "",
      notes: "",
    };

    console.log("Payload to insert:", payload);

    if (!payload.company_name || !payload.contact_name || !payload.email) {
      const errorMsg = "Company name, contact name, and email are required.";
      console.log("Validation failed:", errorMsg);
      setModalMessage(errorMsg);
      setModalSaving(false);
      return;
    }

    try {
      console.log("Inserting customer into Supabase...");
      
      // Debug: Check if env variables are loaded
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const urlSet = !!url && url !== "https://your-project-id.supabase.co";
      const keySet = !!key && key !== "your-anon-key";
      
      console.log("Env Debug:", {
        urlSet,
        urlValue: urlSet ? `${url?.slice(0, 10)}...${url?.slice(-10)}` : "NOT SET or placeholder",
        keySet,
        keyLength: key?.length,
      });
      
      if (!urlSet || !keySet) {
        setModalMessage(`❌ Config Error: ${!urlSet ? "NEXT_PUBLIC_SUPABASE_URL not set or placeholder. " : ""}${!keySet ? "NEXT_PUBLIC_SUPABASE_ANON_KEY not set or placeholder." : ""} Check .env.local and restart dev server.`);
        setModalSaving(false);
        return;
      }
      
      const { data, error } = await supabaseClient.from("customers").insert([payload]);

      console.log("Insert response - data:", data, "error:", error);

      if (error) {
        console.error("Insert error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error,
        });
        
        // Build detailed error message
        let errorMsg = `Supabase Error: ${error.message}`;
        if (error.details) errorMsg += ` | Details: ${error.details}`;
        if (error.hint) errorMsg += ` | Hint: ${error.hint}`;
        if (error.code) errorMsg += ` | Code: ${error.code}`;
        
        setModalMessage(errorMsg);
        setModalSaving(false);
        return;
      }

      console.log("Insert successful, fetching customers...");
      setModalForm({ company_name: "", contact_name: "", phone: "", email: "" });
      setModalMessage("✓ Customer added successfully!");
      
      // Small delay to show success message before closing
      setTimeout(() => {
        setShowModal(false);
        setModalMessage(null);
        setModalSaving(false);
      }, 1000);

      await fetchCustomers(supabaseClient);
    } catch (err) {
      console.error("Catch error:", err);
      const errorDetail = err instanceof Error ? err.message : String(err);
      setModalMessage(`Network/Unexpected Error: ${errorDetail}`);
      setModalSaving(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalForm({ company_name: "", contact_name: "", phone: "", email: "" });
    setModalMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {/* Debug Info */}
        {(() => {
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          const urlSet = !!url && url !== "https://your-project-id.supabase.co";
          const keySet = !!key && key !== "your-anon-key";
          
          if (!urlSet || !keySet) {
            return (
              <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                <strong>⚠️ Configuration Issue:</strong> {!urlSet ? "NEXT_PUBLIC_SUPABASE_URL missing or placeholder. " : ""}
                {!keySet ? "NEXT_PUBLIC_SUPABASE_ANON_KEY missing or placeholder. " : ""}
                Update .env.local and restart dev server (npm run dev).
              </div>
            );
          }
          
          return (
            <div className="rounded-2xl border-2 border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
              ✓ Supabase configured: {url?.slice(0, 20)}... (Key set: {keySet ? "✓" : "✗"})
            </div>
          );
        })()}
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
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
            >
              + Add Customer
            </button>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Add Customer</h2>
              <p className="text-sm text-slate-500">Create a new customer profile in seconds.</p>
            </div>

            {modalMessage && (
              <div className={`mb-4 rounded-xl px-3 py-2 text-sm max-h-40 overflow-y-auto ${
                modalMessage.includes("✓") || modalMessage.includes("successfully")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {modalMessage}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleModalSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Company Name
                </label>
                <input
                  type="text"
                  value={modalForm.company_name}
                  onChange={(e) =>
                    setModalForm((current) => ({
                      ...current,
                      company_name: e.target.value,
                    }))
                  }
                  disabled={modalSaving}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Acme Corp"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={modalForm.contact_name}
                  onChange={(e) =>
                    setModalForm((current) => ({
                      ...current,
                      contact_name: e.target.value,
                    }))
                  }
                  disabled={modalSaving}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <input
                  type="tel"
                  value={modalForm.phone}
                  onChange={(e) =>
                    setModalForm((current) => ({
                      ...current,
                      phone: e.target.value,
                    }))
                  }
                  disabled={modalSaving}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={modalForm.email}
                  onChange={(e) =>
                    setModalForm((current) => ({
                      ...current,
                      email: e.target.value,
                    }))
                  }
                  disabled={modalSaving}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="john@acmecorp.com"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
                >
                  {modalSaving ? "Saving..." : "Add Customer"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={modalSaving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
