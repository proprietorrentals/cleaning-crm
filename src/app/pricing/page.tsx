import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteNav } from "@/components/public-site-nav";
import { PublicSiteFooter } from "@/components/public-site-footer";

const planCards = [
  {
    name: "Starter",
    priceMonthly: "$49",
    priceAnnual: "$39",
    badge: "Launch pricing placeholder",
    features: ["CRM", "Customers", "Quotes", "Jobs", "Invoices"],
  },
  {
    name: "Professional",
    priceMonthly: "$129",
    priceAnnual: "$109",
    badge: "Launch pricing placeholder",
    features: [
      "Everything in Starter",
      "Employee Portal",
      "Customer Portal",
      "Photo verification",
      "Signatures",
      "Mileage approvals",
      "AI Job Reports",
      "AI Supervisor",
    ],
  },
  {
    name: "Enterprise",
    priceMonthly: "Custom",
    priceAnnual: "Custom",
    badge: "Roadmap + onboarding",
    features: [
      "Multi-location",
      "Advanced permissions",
      "Priority support",
      "Custom onboarding",
      "Future API/white-label readiness",
    ],
  },
];

export const metadata: Metadata = {
  title: "ServiceOS Pricing | Launch Plans",
  description:
    "Explore ServiceOS launch pricing placeholders for Starter, Professional, and Enterprise plans built for service teams.",
  openGraph: {
    title: "ServiceOS Pricing | Launch Plans",
    description:
      "See ServiceOS launch pricing placeholders and compare features for field-service operations.",
    images: [{ url: "/serviceos-mark.svg", type: "image/svg+xml" }],
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eaf3ff_0%,#f8fbff_45%,#f5f8fc_100%)] text-slate-900">
      <PublicSiteNav active="pricing" />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <section>
          <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            Pricing
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            ServiceOS plans for teams that need operational clarity
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Pricing below is launch placeholder pricing. This page does not connect checkout yet and does not claim live
            subscription billing activation.
          </p>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Launch pricing placeholder: monthly and annual displays are informational only at this stage.
          </p>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {planCards.map((plan) => (
            <article key={plan.name} className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">{plan.name}</p>
              <h2 className="mt-3 text-4xl font-semibold text-slate-950">{plan.priceMonthly}</h2>
              <p className="mt-1 text-sm text-slate-500">Monthly</p>
              <p className="mt-3 text-xl font-semibold text-slate-800">{plan.priceAnnual}</p>
              <p className="text-sm text-slate-500">Per month, billed annually</p>
              <p className="mt-4 inline-flex w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {plan.badge}
              </p>

              <ul className="mt-6 space-y-2 text-sm text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 text-blue-700">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href="/contact"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Talk to Sales
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-16 rounded-3xl border border-slate-200 bg-white p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Customer Stories</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">Testimonial-ready section</h2>
          <p className="mt-3 text-slate-600">
            Customer stories coming soon. This section is intentionally prepared for future testimonials with no invented
            names, results, or ratings.
          </p>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
