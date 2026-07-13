"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ServiceOSLogo } from "@/components/serviceos-logo";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setMessage("❌ No payment session found");
      setLoading(false);
      return;
    }

    const confirmPayment = async () => {
      try {
        console.log("🔄 Confirming payment for session:", sessionId);
        setMessage("⏳ Updating invoice status...");

        // Call confirm-payment endpoint
        const response = await fetch("/api/stripe/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("❌ Payment confirmation failed:", data);
          setError(
            data.details || data.error || "Failed to confirm payment"
          );
          setMessage("❌ Payment confirmed but invoice update failed");
          setLoading(false);
          return;
        }

        console.log("✅ Payment confirmed successfully:", data);
        setMessage("✓ Payment received successfully!");
        setLoading(false);
      } catch (err: any) {
        console.error("❌ Error confirming payment:", err);
        setError(err.message || "Failed to confirm payment");
        setMessage("❌ Error processing payment confirmation");
        setLoading(false);
      }
    };

    confirmPayment();
  }, [sessionId]);

  return (
    <>
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
          <span className="text-3xl">✓</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-green-600 mb-2">
        Payment Successful!
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        Your invoice payment has been processed and confirmed.
      </p>

      {message && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm border ${
          error
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-green-200 bg-green-50 text-green-700"
        }`}>
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          We could not finalize your payment confirmation automatically. Please contact support.
        </div>
      )}

      {loading && (
        <div className="mb-6 text-center">
          <div className="inline-block">
            <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-blue-600 rounded-full"></div>
          </div>
          <p className="text-sm text-slate-600 mt-2">Processing payment...</p>
        </div>
      )}

      <div className="space-y-3">
        <Link
          href="/customer-portal/invoices"
          className="block w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          Back to Invoices
        </Link>
        <Link
          href="/customer-portal"
          className="block w-full rounded-xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 border border-slate-200"
        >
          Go to Dashboard
        </Link>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          A confirmation email has been sent to your registered email address.
        </p>
      </div>
    </>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-green-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <ServiceOSLogo variant="horizontal" size="mobile" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-green-200 bg-white p-8 shadow-lg text-center">
            <Suspense fallback={<div className="text-center text-slate-600">Loading...</div>}>
              <PaymentSuccessContent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
