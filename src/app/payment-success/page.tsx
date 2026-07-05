"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

function PaymentSuccessContent() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setMessage("❌ No payment session found");
      return;
    }

    setMessage("✓ Payment received successfully!");
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
        <div className="mb-6 rounded-xl px-4 py-3 text-sm border border-green-200 bg-green-50 text-green-700">
          {message}
        </div>
      )}

      {sessionId && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-600 font-medium mb-1">
            Session ID
          </p>
          <p className="text-xs text-slate-700 break-all font-mono">
            {sessionId}
          </p>
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
            <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CR</span>
            </div>
            <span className="font-semibold text-slate-900">Cleaning CRM</span>
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
