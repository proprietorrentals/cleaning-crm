"use client";

import { createClient } from "@/lib/supabase/client";
import { InvoicePDF } from "@/lib/invoice-pdf";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { loadStripe } from "@stripe/stripe-js";

type Customer = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
};

type Job = {
  id: string;
  scheduled_date: string;
  assigned_employee: string | null;
  estimated_value: number;
  notes: string;
};

type InvoiceWithCustomer = {
  id: string;
  invoice_number: string;
  customer_id: string;
  job_id: string;
  amount: number;
  due_date: string;
  status: string;
  notes: string;
  customers: {
    company_name: string;
  } | null;
};

type Invoice = Omit<InvoiceWithCustomer, "customers"> & {
  customers?: {
    company_name: string;
  } | null;
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
    month: "long",
    day: "numeric",
  });
}

export default function CustomerInvoicesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/customer-auth");
        return;
      }

      // Get customer data
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (customerError) {
        console.error("❌ Failed to fetch customer:", customerError);
        setLoading(false);
        return;
      }

      if (!customerData) {
        console.warn("⚠️ No customer profile found for user", session.user.id);
        setLoading(false);
        return;
      }

      setCustomer(customerData);

      // Fetch invoices with customer data joined
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*, customers(company_name)")
        .eq("customer_id", customerData.id)
        .order("created_at", { ascending: false });

      if (invoicesError) {
        console.error("❌ Failed to fetch invoices:", invoicesError);
        setMessage(`Error loading invoices: ${invoicesError.message}`);
      } else {
        setInvoices((invoicesData as Invoice[]) || []);
      }

      // Fetch jobs for invoice details
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq("customer_id", customerData.id);

      if (jobsError) {
        console.error("❌ Failed to fetch jobs:", jobsError);
      } else {
        setJobs(jobsData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [supabase, router]);

  const handleDownloadPDF = async (invoice: Invoice) => {
    setDownloading(invoice.id);

    try {
      const job = jobs.find((j) => j.id === invoice.job_id);

      if (customer) {
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
      } else {
        setMessage("Error: Customer information not loaded");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      setMessage(`Error generating invoice PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setDownloading(null);
    }
  };

  const handlePayment = async (invoice: Invoice) => {
    if (!customer) {
      setMessage("Error: Customer information not loaded");
      return;
    }

    setPaying(invoice.id);
    setMessage(null);

    try {
      // Create Stripe checkout session
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.amount,
          invoiceNumber: invoice.invoice_number,
          customerEmail: customer.email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await response.json();

      if (url) {
        // Redirect to Stripe checkout
        window.location.href = url;
      } else {
        setMessage("❌ Failed to initialize payment");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setMessage(`❌ Payment error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setPaying(null);
    }
  };

  const pendingInvoices = invoices.filter((i) => i.status === "Pending");
  const paidInvoices = invoices.filter((i) => i.status === "Paid");
  const overdueInvoices = invoices.filter((i) => i.status === "Overdue");

  const InvoiceCard = ({ invoice }: { invoice: Invoice }) => {
    const statusColor =
      invoice.status === "Paid"
        ? "bg-green-50 text-green-700"
        : invoice.status === "Overdue"
          ? "bg-red-50 text-red-700"
          : "bg-yellow-50 text-yellow-700";

    const companyName = invoice.customers?.company_name || customer?.company_name || "Invoice";

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-600">{invoice.invoice_number}</p>
            <p className="text-xs text-slate-500 mt-1">{companyName}</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              {formatCurrency(invoice.amount)}
            </p>
          </div>
          <span className={`rounded-lg px-3 py-1 text-sm font-medium ${statusColor}`}>
            {invoice.status}
          </span>
        </div>

        <p className="text-sm text-slate-600 mb-3">Due {formatDate(invoice.due_date)}</p>

        {invoice.notes && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-4">
            <p className="text-xs font-medium text-slate-700">Notes:</p>
            <p className="text-sm text-slate-600 mt-1">{invoice.notes}</p>
          </div>
        )}

        <div className="flex gap-3">
          {(invoice.status === "Pending" || invoice.status === "Overdue") && (
            <button
              onClick={() => handlePayment(invoice)}
              disabled={paying === invoice.id}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {paying === invoice.id ? "Processing..." : "💳 Pay Now"}
            </button>
          )}
          <button
            onClick={() => handleDownloadPDF(invoice)}
            disabled={downloading === invoice.id}
            className={`flex-1 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
              (invoice.status === "Pending" || invoice.status === "Overdue") ? "" : "w-full"
            }`}
          >
            {downloading === invoice.id ? "Downloading..." : "⬇ PDF"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/customer-portal" className="text-slate-600 hover:text-slate-900">
              ← Back to Portal
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Your Invoices</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {message && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-2"></div>
              <p className="text-slate-600">Loading invoices...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Pending Invoices */}
            {pendingInvoices.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 text-xl font-bold text-slate-900">Pending Payment</h2>
                <div className="grid gap-4">
                  {pendingInvoices.map((invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              </section>
            )}

            {/* Overdue Invoices */}
            {overdueInvoices.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 text-xl font-bold text-red-600">Overdue</h2>
                <div className="grid gap-4">
                  {overdueInvoices.map((invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              </section>
            )}

            {/* Paid Invoices */}
            {paidInvoices.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 text-xl font-bold text-slate-900">Paid</h2>
                <div className="grid gap-4">
                  {paidInvoices.map((invoice) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} />
                  ))}
                </div>
              </section>
            )}

            {/* No Invoices */}
            {invoices.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-slate-600">No invoices at this time.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
