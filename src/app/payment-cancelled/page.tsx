"use client";

import Link from "next/link";

export default function PaymentCancelledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-red-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CR</span>
            </div>
            <span className="font-semibold text-slate-900">Cleaning CRM</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-lg text-center">
            {/* Cancel Icon */}
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-3xl">✕</span>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-red-600 mb-2">
              Payment Cancelled
            </h1>
            <p className="text-sm text-slate-600 mb-6">
              Your payment was not completed. Your invoice remains unpaid and you can retry anytime.
            </p>

            <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm text-orange-700">
                💡 No charges were made to your account.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/customer-portal/invoices"
                className="block w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
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
                If you continue to experience issues, please contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
