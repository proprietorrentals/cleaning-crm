import Link from "next/link";
import { PublicSiteNav } from "@/components/public-site-nav";
import { PublicSiteFooter } from "@/components/public-site-footer";

const featureCards = [
  {
    title: "AI Supervisor Dashboard",
    detail:
      "Monitor jobs, teams, bottlenecks, and risk signals in one command center designed for real-time decisions.",
  },
  {
    title: "Customer and Employee Management",
    detail:
      "Keep customer records, employee roles, and contact details organized so every visit starts with context.",
  },
  {
    title: "Quotes, Scheduling, and Job Management",
    detail:
      "Move from approved quotes to scheduled jobs with clear assignments, statuses, and accountability.",
  },
  {
    title: "Before/After Photos and Signatures",
    detail:
      "Capture visual proof of work and customer sign-off directly in the workflow to reduce disputes.",
  },
  {
    title: "Mileage Tracking and Approvals",
    detail:
      "Track travel activity and review mileage approvals with clear audit history for payroll and reimbursements.",
  },
  {
    title: "Invoices and Stripe Payments",
    detail:
      "Generate invoices fast and collect payments through Stripe with status visibility from sent to paid.",
  },
  {
    title: "AI Job Completion Reports",
    detail:
      "Produce polished completion reports that combine photos, signatures, notes, and operational detail.",
  },
  {
    title: "Customer and Employee Portals",
    detail:
      "Deliver role-based experiences for field teams and customers without exposing internal admin workflows.",
  },
];

const testimonialPlaceholders = [
  {
    label: "Demo testimonial slot",
    quote: "Add a future customer success story here.",
  },
  {
    label: "Demo testimonial slot",
    quote: "Add an operations-focused review here.",
  },
  {
    label: "Demo testimonial slot",
    quote: "Add a team productivity quote here.",
  },
];

const flowSteps = ["Lead", "Quote", "Schedule", "Complete Job", "Report", "Invoice", "Payment"];

export function PublicHomepage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#dbeafe_0%,#f8fbff_35%,#f5f8fc_100%)] text-slate-900">
      <PublicSiteNav active="home" />

      <main id="home" className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Operate with Confidence.
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Run Your Service Business Smarter.
            </h1>
            <p className="mt-4 text-xl text-blue-900">From Lead to Payment. One Platform.</p>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              ServiceOS helps service businesses manage customers, quotes, jobs, employees, photos,
              signatures, mileage, invoices, payments, AI reports, and daily operations from one secure system.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Start Free Trial
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Explore Demo
              </Link>
            </div>
          </div>

          <div aria-label="Product preview" className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-5 shadow-2xl shadow-blue-900/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#1d4ed8_0%,#020617_55%)]" />
            <div className="relative space-y-4">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-300">AI Supervisor Dashboard</p>
                <p className="mt-2 text-2xl font-semibold text-white">84/100 Health Score</p>
                <p className="mt-1 text-sm text-slate-300">12 active alerts across field operations</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                  <p className="text-xs text-slate-400">Jobs Today</p>
                  <p className="mt-1 text-lg font-semibold text-white">27</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                  <p className="text-xs text-slate-400">Invoices Pending</p>
                  <p className="mt-1 text-lg font-semibold text-white">9</p>
                </div>
              </div>
              <p className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
                UI mock section based on existing ServiceOS dashboard concepts.
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="mt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Features</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">Everything needed to run daily operations</h2>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature) => (
              <article
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-800">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="ai-supervisor" className="mt-20 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-slate-50 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">AI Supervisor</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950">Visibility and direction for every shift</h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            ServiceOS highlights late arrivals, missing photos, signature gaps, and overdue invoices so supervisors can focus
            where action is needed first.
          </p>
        </section>

        <section className="mt-20" aria-label="Workflow">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">How It Works</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">Lead to revenue in one connected flow</h2>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-700">
            {flowSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <span className="rounded-full border border-slate-300 bg-white px-4 py-2">{step}</span>
                {index < flowSteps.length - 1 ? <span aria-hidden="true" className="text-blue-700">→</span> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-slate-200 bg-white p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Portals</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">Connected experiences for every role</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Admin Portal</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Run operations, approvals, billing, and AI oversight from a central dashboard.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Employee Portal</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Track assigned jobs, capture before/after photos, signatures, and mileage activity in the field.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Customer Portal</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Review quotes, monitor job progress, view invoices, and complete Stripe payments securely.</p>
            </article>
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-slate-200 bg-white p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Social Proof</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">Testimonials coming soon</h2>
          <p className="mt-3 text-slate-600">Placeholder cards below are clearly marked demo content for future customer stories.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {testimonialPlaceholders.map((item, index) => (
              <blockquote key={`${item.label}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-2 text-slate-700">{item.quote}</p>
              </blockquote>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-blue-200 bg-blue-700 p-8 text-blue-50">
          <h2 className="text-3xl font-semibold">Operate with Confidence.</h2>
          <p className="mt-3 max-w-2xl text-blue-100">
            Start with a free trial, explore the live demo, and see how ServiceOS can simplify your full operation.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl border border-blue-100 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              View Pricing
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center rounded-xl border border-blue-100 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Explore Demo
            </Link>
          </div>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
