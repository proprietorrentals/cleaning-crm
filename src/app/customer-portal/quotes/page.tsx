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
  extra_services: string[] | null;
  notes: string;
  status?: "Pending" | "Sent" | "Approved" | "Rejected";
  created_at: string;
};

type QuoteLineItem = {
  id: string;
  quote_id: string;
  item_name: string;
  amount: number;
  customer_description: string | null;
  customer_visible: boolean;
  created_at: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
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
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [lineItemsByQuote, setLineItemsByQuote] = useState<Record<string, QuoteLineItem[]>>({});
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

      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (customerError || !customer) {
        setMessage(customerError?.message ?? "No customer profile found.");
        setLoading(false);
        return;
      }

      const { data: quotesData, error: quotesError } = await supabase
        .from("quotes")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (quotesError) {
        setMessage(`Error loading quotes: ${quotesError.message}`);
        setLoading(false);
        return;
      }

      const typedQuotes = (quotesData ?? []) as Quote[];
      setQuotes(typedQuotes);

      if (typedQuotes.length > 0) {
        const quoteIds = typedQuotes.map((quote) => quote.id);
        const { data: quoteLineItems, error: lineItemError } = await supabase
          .from("quote_line_items")
          .select("id,quote_id,item_name,amount,customer_description,customer_visible,created_at")
          .in("quote_id", quoteIds)
          .eq("customer_visible", true)
          .order("created_at", { ascending: true });

        if (lineItemError) {
          setMessage(`Quotes loaded but line items failed: ${lineItemError.message}`);
        } else {
          const grouped: Record<string, QuoteLineItem[]> = {};
          for (const item of (quoteLineItems ?? []) as QuoteLineItem[]) {
            if (!grouped[item.quote_id]) grouped[item.quote_id] = [];
            grouped[item.quote_id].push(item);
          }
          setLineItemsByQuote(grouped);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [supabase, router]);

  const handleApproveQuote = async (quote: Quote) => {
    setApproving(quote.id);
    setMessage(null);

    const jobPayload = {
      quote_id: quote.id,
      customer_id: quote.customer_id,
      scheduled_date: new Date().toISOString().split("T")[0],
      assigned_employee: null,
      status: "Scheduled",
      estimated_value: quote.total_estimate,
      notes: quote.notes || "",
    };

    const { data: jobData, error: jobError } = await supabase.from("jobs").insert(jobPayload).select();

    if (jobError || !jobData?.[0]) {
      setMessage(`Failed to create job: ${jobError?.message ?? "Unknown error"}`);
      setApproving(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("quotes")
      .update({ status: "Approved" })
      .eq("id", quote.id);

    if (updateError) {
      setMessage(`Job created but quote status update failed: ${updateError.message}`);
      setApproving(null);
      return;
    }

    const { data: quotesData } = await supabase
      .from("quotes")
      .select("*")
      .eq("customer_id", quote.customer_id)
      .order("created_at", { ascending: false });

    setQuotes((quotesData ?? []) as Quote[]);
    setMessage(`Quote approved. Job #${jobData[0].id.slice(0, 8).toUpperCase()} is scheduled.`);
    setApproving(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/customer-portal" className="text-slate-600 hover:text-slate-900">
              Back to Portal
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Your Quotes</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {message ? (
          <div
            className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
              message.toLowerCase().includes("failed") || message.toLowerCase().includes("error")
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
              <p className="text-slate-600">Loading quotes...</p>
            </div>
          </div>
        ) : quotes.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-600">No quotes available at this time.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {quotes.map((quote) => {
              const lineItems = lineItemsByQuote[quote.id] ?? [];

              return (
                <div key={quote.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Quote #{quote.id.slice(0, 8).toUpperCase()}</p>
                      <p className="mt-1 text-3xl font-bold text-slate-900">{formatCurrency(quote.total_estimate)}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        Status: {quote.status ?? "Pending"}
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
                      <p className="font-semibold text-slate-900">{quote.extra_services?.length || 0}</p>
                    </div>
                  </div>

                  {lineItems.length > 0 ? (
                    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-sm font-medium text-slate-900">Pricing breakdown</p>
                      <div className="space-y-2">
                        {lineItems.map((item) => (
                          <div key={item.id} className="flex items-start justify-between text-sm">
                            <div>
                              <p className="text-slate-800">{item.item_name}</p>
                              {item.customer_description ? (
                                <p className="text-xs text-slate-500">{item.customer_description}</p>
                              ) : null}
                            </div>
                            <p className={item.amount < 0 ? "text-rose-600" : "text-slate-900"}>
                              {formatCurrency(item.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {quote.notes ? (
                    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-700">Notes:</p>
                      <p className="mt-1 text-sm text-slate-600">{quote.notes}</p>
                    </div>
                  ) : null}

                  <button
                    onClick={() => handleApproveQuote(quote)}
                    disabled={approving === quote.id || (quote.status ?? "Pending") === "Approved"}
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                  >
                    {(quote.status ?? "Pending") === "Approved"
                      ? "Already Approved"
                      : approving === quote.id
                        ? "Processing..."
                        : "Approve and Schedule"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
