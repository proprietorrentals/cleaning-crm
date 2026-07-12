import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteNav } from "@/components/public-site-nav";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { ServiceOSBrand } from "@/components/serviceos-brand";

type PlanCard = {
  name: string;
  priceMonthly: string;
  badge: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

type ComparisonRow = {
  label: string;
  starter: string;
  professional: string;
  enterprise: string;
};

const planCards: PlanCard[] = [
  {
    name: "Starter",
    priceMonthly: "$99",
    badge: "Best for launch",
    description: "Get your service business organized with the essentials for daily operations.",
    features: ["CRM", "Customers", "Quotes", "Jobs", "Invoices"],
  },
  {
    name: "Professional",
    priceMonthly: "$199",
    badge: "Most popular",
    description: "The complete operating system for teams that want AI, field visibility, and customer experience in one place.",
    features: [
      "Everything in Starter",
      "AI Supervisor",
      "Website Builder",
      "Employee Portal",
      "Customer Portal",
      "AI Reports",
      "Mileage",
      "Photos",
      "Signatures",
      "Stripe Payments",
      "Business Health Dashboard",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    priceMonthly: "Contact Sales",
    badge: "For larger rollouts",
    description: "Built for organizations that need deeper deployment support, permissions, and scale.",
    features: [
      "Multi-location",
      "Advanced permissions",
      "Priority support",
      "Custom onboarding",
      "Future API/white-label readiness",
    ],
  },
];

const comparisonRows: ComparisonRow[] = [
  { label: "CRM, quotes, jobs, invoices", starter: "Included", professional: "Included", enterprise: "Included" },
  { label: "AI Supervisor", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "Website Builder", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "Employee Portal", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "Customer Portal", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "AI Reports", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "Mileage", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "Photos + Signatures", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "Stripe Payments", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "Business Health Dashboard", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "Multi-location controls", starter: "—", professional: "—", enterprise: "Included" },
  { label: "Dedicated onboarding", starter: "—", professional: "—", enterprise: "Included" },
];

const faqs = [
  {
    question: "Can I cancel anytime?",
    answer: "Yes. You can cancel anytime and keep access through the end of your billing period.",
  },
  {
    question: "Is there a free trial?",
    answer: "Yes. You can start a free trial to explore the workflow before you commit.",
  },
  {
    question: "Can I upgrade later?",
    answer: "Yes. You can start small and upgrade when your team needs more automation or portals.",
  },
  {
    question: "Do you help with onboarding?",
    answer: "Yes. We provide onboarding support so your team can get live quickly and confidently.",
  },
];

export const metadata: Metadata = {
  title: "ServiceOS Pricing | AI Operating System for Service Businesses",
  description:
    "Compare ServiceOS pricing plans for an AI-powered operating system for service businesses.",
  openGraph: {
    title: "ServiceOS Pricing | AI Operating System for Service Businesses",
    description:
      "Compare ServiceOS pricing plans, feature differences, FAQs, and calls to action for service teams.",
    images: [{ url: "/serviceos-mark.svg", type: "image/svg+xml" }],
  },
};

function tick(value: string) {
  return value === "Included" ? (
    <span className="inline-flex items-center gap-2 text-emerald-700">
      <span className="text-emerald-500">✓</span>
      <span>{value}</span>
    </span>
  ) : (
    <span className="text-slate-500">{value}</span>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#edf5ff_0%,#f8fbff_44%,#f3f7fb_100%)] text-slate-900">
      <PublicSiteNav active="pricing" />

      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:px-8 sm:py-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Pricing
              </div>
              <div className="max-w-2xl">
                <div className="mb-5">
                  <ServiceOSBrand variant="full" showTagline />
                </div>
                <h1 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
                  An AI-powered operating system for service businesses.
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                  Pick the plan that matches how your team works today and how you want to scale tomorrow. ServiceOS
                  connects operations, portals, payments, reporting, and field intelligence into one premium experience.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Book a Demo
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>

            <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-1">
              {[
                { label: "Connected operations", value: "Run the field, office, and customer experience from one system." },
                { label: "Built for growth", value: "Add portals, payments, and AI tools as your team scales." },
                { label: "Premium support", value: "Get guided implementation and onboarding support from day one." },
                { label: "Professional by default", value: "The Professional plan is designed to be the fastest path to value." },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          {planCards.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-white p-6 shadow-sm transition ${
                plan.highlighted
                  ? "border-blue-300 ring-2 ring-blue-200 shadow-[0_24px_50px_rgba(37,99,235,0.12)]"
                  : "border-slate-200"
              }`}
            >
              {plan.highlighted ? <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" /> : null}
              <div
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                  plan.highlighted ? "bg-blue-50 text-blue-700" : plan.name === "Enterprise" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {plan.badge}
              </div>
              <div className="mt-4">
                <h2 className={`text-2xl font-semibold ${plan.highlighted ? "text-slate-950" : "text-slate-950"}`}>{plan.name}</h2>
                <p className={`mt-2 rounded-2xl px-4 py-3 text-sm leading-6 ${plan.highlighted ? "bg-blue-50 text-blue-950" : "bg-slate-50 text-slate-700"}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mt-6 flex items-end gap-2">
                <p className={`text-5xl font-semibold ${plan.highlighted ? "text-blue-700" : "text-slate-950"}`}>
                  {plan.priceMonthly}
                </p>
                <p className="pb-1 text-sm text-slate-500">/ month</p>
              </div>
              <p className="mt-2 text-sm text-slate-500">No annual pricing for now.</p>

              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href={plan.highlighted ? "/contact" : "/signup"}
                  className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
                    plan.highlighted ? "bg-blue-700 hover:bg-blue-800" : plan.name === "Enterprise" ? "bg-slate-950 hover:bg-slate-800" : "bg-slate-800 hover:bg-slate-900"
                  }`}
                >
                  {plan.highlighted ? "Book a Demo" : plan.name === "Enterprise" ? "Talk to Sales" : "Start Free Trial"}
                </Link>
                {plan.highlighted ? (
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    Start Free Trial
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-16 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Feature comparison</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">See how the plans differ at a glance</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              Professional is the best fit for teams that need field visibility, customer-facing tools, and AI-assisted operations.
            </p>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="min-w-[760px] w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Feature</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Starter</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium text-blue-700">Professional</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, index) => (
                  <tr key={row.label} className={index % 2 === 0 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="border-b border-slate-100 px-4 py-4 font-medium text-slate-900">{row.label}</td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-600">{tick(row.starter)}</td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-600">{tick(row.professional)}</td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-600">{tick(row.enterprise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-blue-200 bg-gradient-to-br from-blue-700 via-sky-600 to-cyan-500 p-8 text-white shadow-[0_20px_60px_rgba(37,99,235,0.18)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Why Professional stands out</p>
            <h2 className="mt-3 text-3xl font-semibold">The fastest way to run your service business with confidence.</h2>
            <p className="mt-4 text-sm leading-6 text-blue-50">
              Professional brings together AI Supervisor, Website Builder, portals, AI Reports, Mileage, Photos,
              Signatures, Stripe Payments, and the Business Health Dashboard.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Book a Demo
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Start Free Trial
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Frequently asked questions</p>
            <div className="mt-6 space-y-4">
              {faqs.map((faq) => (
                <details key={faq.question} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 open:bg-white">
                  <summary className="cursor-pointer list-none text-base font-semibold text-slate-950">
                    <span className="flex items-center justify-between gap-4">
                      {faq.question}
                      <span className="text-slate-400 transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-[2rem] border border-slate-200 bg-slate-950 px-8 py-10 text-white shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">Ready to see it live?</p>
              <h2 className="mt-2 text-3xl font-semibold">Operate with Confidence.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Explore the exact workflows your team will use: customer management, jobs, mileage, AI reports, and portal access in one place.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Book a Demo
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
