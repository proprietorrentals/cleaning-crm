import type { Metadata } from "next";
import { PublicSiteNav } from "@/components/public-site-nav";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { ContactForm } from "@/app/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact ServiceOS | Request a Demo",
  description:
    "Request a ServiceOS demo for your service business. Share your workflow details and team size so we can tailor the walkthrough.",
  openGraph: {
    title: "Contact ServiceOS | Request a Demo",
    description: "Book a ServiceOS demo and see how to run service operations with confidence.",
    images: [{ url: "/serviceos-mark.svg", type: "image/svg+xml" }],
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eaf3ff_0%,#f8fbff_45%,#f5f8fc_100%)] text-slate-900">
      <PublicSiteNav active="contact" />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Contact
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Request a tailored ServiceOS demo
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              Tell us about your operation and we will prepare a focused walkthrough covering customers, quotes, jobs,
              employee workflows, photos, signatures, mileage, invoicing, and payments.
            </p>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">What happens next</p>
              <p className="mt-2">1. Submit your request.</p>
              <p>2. We review your business profile.</p>
              <p>3. We follow up with a customized demo plan.</p>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-950">Demo request form</h2>
            <p className="mt-2 text-sm text-slate-600">All required fields are marked and validated before submission.</p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </section>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
