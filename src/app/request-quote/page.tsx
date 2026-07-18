import type { Metadata } from "next";
import { RequestQuoteForm } from "@/app/request-quote/request-quote-form";

export const metadata: Metadata = {
  title: "Request a Commercial Cleaning Quote | ServiceOS",
  description:
    "Submit your facility details and receive a tailored commercial cleaning quote from the ServiceOS marketplace.",
};

export default function RequestQuotePage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-8 max-w-3xl">
          <p className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-800">
            Lead Marketplace
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Request a commercial cleaning quote
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Tell us about your property, scope, and timeline. We will match your
            request with the right commercial cleaning team.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <RequestQuoteForm />
        </div>
      </div>
    </main>
  );
}
