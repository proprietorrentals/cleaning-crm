"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  cleaning_frequency: string;
};

type Quote = {
  id: string;
  total_estimate: number;
  created_at: string;
};

type Job = {
  id: string;
  status: string;
  scheduled_date: string;
  estimated_value: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CustomerPortalPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const initPortal = async () => {
      // Check authentication
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        router.push("/customer-auth");
        return;
      }

      setUser(session.user);

      // Fetch customer data
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (customerError) {
        console.error("❌ Failed to fetch customer:", customerError);
        setMessage(`Error loading customer data: ${customerError.message}`);
        setLoading(false);
        return;
      }

      setCustomer(customerData);

      // Fetch quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from("quotes")
        .select("id, total_estimate, created_at")
        .eq("customer_id", customerData.id)
        .order("created_at", { ascending: false });

      if (quotesError) {
        console.error("❌ Failed to fetch quotes:", quotesError);
      } else {
        setQuotes(quotesData || []);
      }

      // Fetch jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("id, status, scheduled_date, estimated_value")
        .eq("customer_id", customerData.id)
        .order("scheduled_date", { ascending: true });

      if (jobsError) {
        console.error("❌ Failed to fetch jobs:", jobsError);
      } else {
        setJobs(jobsData || []);
      }

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, status, due_date")
        .eq("customer_id", customerData.id)
        .order("created_at", { ascending: false });

      if (invoicesError) {
        console.error("❌ Failed to fetch invoices:", invoicesError);
      } else {
        setInvoices(invoicesData || []);
      }

      setLoading(false);
    };

    initPortal();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/customer-auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const scheduledJobs = jobs.filter((j) => j.status === "Scheduled" || j.status === "In Progress");
  const completedJobs = jobs.filter((j) => j.status === "Completed");
  const pendingInvoices = invoices.filter((i) => i.status === "Pending");
  const paidInvoices = invoices.filter((i) => i.status === "Paid");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600">CUSTOMER PORTAL</p>
              <p className="text-sm font-semibold text-slate-900">{customer?.company_name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {message && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}

        {/* Company Info */}
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Company Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-600">Contact Person</p>
              <p className="font-semibold text-slate-900">{customer?.contact_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Email</p>
              <p className="font-semibold text-slate-900">{customer?.email}</p>
            </div>
            {customer?.phone && (
              <div>
                <p className="text-sm text-slate-600">Phone</p>
                <p className="font-semibold text-slate-900">{customer.phone}</p>
              </div>
            )}
            {customer?.cleaning_frequency && (
              <div>
                <p className="text-sm text-slate-600">Cleaning Frequency</p>
                <p className="font-semibold text-slate-900 capitalize">{customer.cleaning_frequency}</p>
              </div>
            )}
          </div>
        </section>

        {/* Summary Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-600">Active Quotes</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{quotes.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-600">Scheduled Jobs</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{scheduledJobs.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-600">Completed Jobs</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{completedJobs.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-600">Pending Invoices</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{pendingInvoices.length}</p>
          </div>
        </div>

        {/* Quotes */}
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Active Quotes</h2>
            <Link
              href="/customer-portal/quotes"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all →
            </Link>
          </div>
          {quotes.length === 0 ? (
            <p className="text-sm text-slate-500">No quotes at this time.</p>
          ) : (
            <div className="space-y-3">
              {quotes.slice(0, 3).map((quote) => (
                <div key={quote.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <p className="text-sm text-slate-600">Quote #{quote.id.slice(0, 8)}</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(quote.total_estimate)}</p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(quote.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Scheduled Jobs */}
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Scheduled Jobs</h2>
            <Link
              href="/customer-portal/jobs"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all →
            </Link>
          </div>
          {scheduledJobs.length === 0 ? (
            <p className="text-sm text-slate-500">No scheduled jobs.</p>
          ) : (
            <div className="space-y-3">
              {scheduledJobs.slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                >
                  <div>
                    <p className="text-sm text-slate-600">{formatDate(job.scheduled_date)}</p>
                    <p className="font-semibold text-slate-900">{job.status}</p>
                  </div>
                  <p className="font-semibold text-slate-900">{formatCurrency(job.estimated_value)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Invoices */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
            <Link
              href="/customer-portal/invoices"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all →
            </Link>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-500">No invoices at this time.</p>
          ) : (
            <div className="space-y-3">
              {invoices.slice(0, 3).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
                    <p className={`text-xs font-medium ${
                      invoice.status === "Paid" ? "text-green-600" : "text-yellow-600"
                    }`}>
                      {invoice.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(invoice.amount)}</p>
                    <p className="text-xs text-slate-500">Due {formatDate(invoice.due_date)}</p>
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
