import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteNav } from "@/components/public-site-nav";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { ServiceOSBrand } from "@/components/serviceos-brand";

type PlanCard = {
  name: string;
  priceMonthly: string;
  priceAnnual: string;
  badge: string;
  accent: string;
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
    priceMonthly: "$49",
    priceAnnual: "$39",
    badge: "Best for launch",
    accent: "from-slate-50 via-white to-slate-100",
    description: "Core CRM workflow for small teams getting organized.",
    features: ["CRM", "Customers", "Quotes", "Jobs", "Invoices"],
  },
  {
    name: "Professional",
    priceMonthly: "$129",
    priceAnnual: "$109",
    badge: "Most popular",
    accent: "from-blue-600 via-sky-500 to-cyan-400",
    description: "Everything a growing service company needs to run daily operations.",
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
    highlighted: true,
  },
  {
    name: "Enterprise",
    priceMonthly: "Custom",
    priceAnnual: "Custom",
    badge: "For multi-location teams",
    accent: "from-slate-950 via-slate-900 to-slate-800",
    description: "Structured for larger rollouts, advanced permissions, and onboarding support.",
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
  { label: "Employee portal", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "Customer portal", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "Photo verification + signatures", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "Mileage approvals", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "AI job reports + supervisor tools", starter: "—", professional: "Included", enterprise: "Included" },
  { label: "Multi-location controls", starter: "—", professional: "—", enterprise: "Included" },
  { label: "Dedicated onboarding", starter: "—", professional: "—", enterprise: "Included" },
];

const faqs = [
  {
    question: "Are these live subscription prices?",
    answer:
      "Not yet. The pricing page is launch-ready positioning and does not connect checkout or promise active billing until implementation is complete.",
  },
  {
    question: "What is included in Professional?",
    answer:
      "Professional is the recommended plan for service businesses that need field operations, customer access, mileage review, and AI-assisted reporting in one system.",
  },
  {
    question: "Can Enterprise be customized?",
    answer:
      "Yes. Enterprise is structured for multi-location deployments, permissions, onboarding support, and future white-label or API requirements.",
  },
  {
    question: "Can I start with a trial before talking to sales?",
    answer:
      "Yes. You can start a free trial if you want to explore the product first, or book a demo if you want a guided walkthrough.",
  },
];

export const metadata: Metadata = {
  title: "ServiceOS Pricing | Plans for Service Teams",
  description:
    "Compare ServiceOS launch pricing plans, review the feature matrix, and book a demo or start a free trial.",
  openGraph: {
    title: "ServiceOS Pricing | Plans for Service Teams",
    description:
      "Compare ServiceOS pricing plans, see the feature comparison, and choose the best plan for your team.",
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
                  Plans designed for operational clarity, not guesswork.
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                  Choose the plan that matches how your team runs jobs, communicates with customers, reviews mileage,
                  and keeps service quality visible from the field to the office.
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
                { label: "Fast setup", value: "Launch with CRM, jobs, and portals without rebuilding your process." },
                { label: "Field-ready", value: "Employees can track jobs, photos, signatures, and mileage from mobile workflows." },
                { label: "Supervisor control", value: "Mileage approvals, AI reporting, and review queues stay in one place." },
                { label: "Scales with growth", value: "Move from one team to multiple locations without changing systems." },
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
              {plan.highlighted ? (
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${plan.accent}`} />
              ) : null}
              <div
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                  plan.highlighted ? "bg-blue-50 text-blue-700" : plan.name === "Enterprise" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {plan.badge}
              </div>
              <div className="mt-4">
                <h2 className={`text-2xl font-semibold ${plan.highlighted ? "text-slate-950" : "text-slate-950"}`}>{plan.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>
              </div>

              <div className="mt-6 flex items-end gap-2">
                <p className={`text-5xl font-semibold ${plan.highlighted ? "text-blue-700" : "text-slate-950"}`}>
                  {plan.priceMonthly}
                </p>
                <p className="pb-1 text-sm text-slate-500">/ month</p>
              </div>
              <p className="mt-2 text-sm text-slate-500">{plan.priceAnnual} per month billed annually</p>

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
            <h2 className="mt-3 text-3xl font-semibold">The plan that maps directly to real field operations.</h2>
            <p className="mt-4 text-sm leading-6 text-blue-50">
              Professional adds the portal, approvals, signatures, and AI reporting layers that turn ServiceOS from a CRM into a complete operational system.
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
              <h2 className="mt-2 text-3xl font-semibold">Book a walkthrough or start a trial today.</h2>
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
