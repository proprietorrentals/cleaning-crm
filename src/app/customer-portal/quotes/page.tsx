"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Quote = {
  id: string;
  customer_id: string;
  total_estimate: number;
  square_footage: number;
  cleaning_frequency: string;
  extra_services: string[];
  notes: string;
  created_at: string;
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

export default function CustomerQuotesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
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

      // Get customer ID
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (customerError) {
        console.error("❌ Failed to fetch customer:", customerError);
        setLoading(false);
        return;
      }

      setCustomerId(customer.id);

      // Fetch quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from("quotes")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (quotesError) {
        console.error("❌ Failed to fetch quotes:", quotesError);
        setMessage(`Error loading quotes: ${quotesError.message}`);
      } else {
        setQuotes(quotesData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [supabase, router]);

  const handleApproveQuote = async (quote: Quote) => {
    setApproving(quote.id);

    try {
      // Create job from quote
      const { error } = await supabase.from("jobs").insert({
        quote_id: quote.id,
        customer_id: quote.customer_id,
        scheduled_date: new Date().toISOString().split("T")[0],
        status: "Scheduled",
        estimated_value: quote.total_estimate,
        notes: quote.notes,
      });

      if (error) {
        console.error("❌ Failed to approve quote:", error);
        setMessage(`Error approving quote: ${error.message}`);
      } else {
        setMessage(`✓ Quote approved! A job has been scheduled for your company.`);
        // Reload quotes
        const { data: quotesData } = await supabase
          .from("quotes")
          .select("*")
          .eq("customer_id", quote.customer_id)
          .order("created_at", { ascending: false });
        setQuotes(quotesData || []);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage(`An error occurred: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setApproving(null);
    }
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
            <h1 className="text-2xl font-bold text-slate-900">Your Quotes</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {message && (
          <div
            className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
              message.includes("❌")
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-2"></div>
              <p className="text-slate-600">Loading quotes...</p>
            </div>
          </div>
        ) : quotes.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-600">No quotes available at this time.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {quotes.map((quote) => (
              <div key={quote.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Quote #{quote.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      {formatCurrency(quote.total_estimate)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">{formatDate(quote.created_at)}</p>
                </div>

                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-600">Area</p>
                    <p className="font-semibold text-slate-900">{quote.square_footage} sq ft</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-600">Frequency</p>
                    <p className="font-semibold text-slate-900 capitalize">{quote.cleaning_frequency}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-600">Extra Services</p>
                    <p className="font-semibold text-slate-900">{quote.extra_services.length || 0}</p>
                  </div>
                </div>

                {quote.extra_services.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-slate-900 mb-2">Additional Services:</p>
                    <div className="flex flex-wrap gap-2">
                      {quote.extra_services.map((service) => (
                        <span
                          key={service}
                          className="rounded-lg bg-blue-50 px-3 py-1 text-sm text-blue-700"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {quote.notes && (
                  <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-700">Notes:</p>
                    <p className="text-sm text-slate-600 mt-1">{quote.notes}</p>
                  </div>
                )}

                <button
                  onClick={() => handleApproveQuote(quote)}
                  disabled={approving === quote.id}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {approving === quote.id ? "Processing..." : "✓ Approve & Schedule"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
