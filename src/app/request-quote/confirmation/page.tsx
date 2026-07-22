import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function RequestQuoteConfirmationPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="w-full rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Submission received
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            Thanks for your request
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Your quote request has been submitted successfully. Our team will
            review your details and follow up shortly.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/request-quote"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Submit another request
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Back to homepage
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
