"use client";

import Link from "next/link";
import { PublicSiteNav } from "@/components/public-site-nav";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { useI18n } from "@/components/i18n-provider";
import { useLocaleFormat } from "@/lib/i18n/format";

export function PublicHomepage() {
  const { t } = useI18n();
  const { formatNumber } = useLocaleFormat();

  const featureCards = [
    {
      title: t("public.featureAiDashboardTitle"),
      detail: t("public.featureAiDashboardDetail"),
    },
    {
      title: t("public.featureCustomerEmployeeTitle"),
      detail: t("public.featureCustomerEmployeeDetail"),
    },
    {
      title: t("public.featureQuotesSchedulingTitle"),
      detail: t("public.featureQuotesSchedulingDetail"),
    },
    {
      title: t("public.featurePhotosSignaturesTitle"),
      detail: t("public.featurePhotosSignaturesDetail"),
    },
    {
      title: t("public.featureMileageTitle"),
      detail: t("public.featureMileageDetail"),
    },
    {
      title: t("public.featureInvoicesTitle"),
      detail: t("public.featureInvoicesDetail"),
    },
    {
      title: t("public.featureAiReportsTitle"),
      detail: t("public.featureAiReportsDetail"),
    },
    {
      title: t("public.featurePortalsTitle"),
      detail: t("public.featurePortalsDetail"),
    },
  ];

  const testimonialPlaceholders = [
    {
      label: t("public.testimonialSlotLabel"),
      quote: t("public.testimonialSlotQuote1"),
    },
    {
      label: t("public.testimonialSlotLabel"),
      quote: t("public.testimonialSlotQuote2"),
    },
    {
      label: t("public.testimonialSlotLabel"),
      quote: t("public.testimonialSlotQuote3"),
    },
  ];

  const flowSteps = [
    t("public.flowLead"),
    t("public.flowQuote"),
    t("public.flowSchedule"),
    t("public.flowCompleteJob"),
    t("public.flowReport"),
    t("public.flowInvoice"),
    t("public.flowPayment"),
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#dbeafe_0%,#f8fbff_35%,#f5f8fc_100%)] text-slate-900">
      <PublicSiteNav active="home" />

      <main id="home" className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              {t("public.operateWithConfidence")}
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {t("public.heroTitle")}
            </h1>
            <p className="mt-4 text-xl text-blue-900">{t("public.heroSubtitle")}</p>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {t("public.heroCopy")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {t("public.startFreeTrial")}
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {t("public.navExploreDemo")}
              </Link>
            </div>
          </div>

          <div aria-label="Product preview" className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-5 shadow-2xl shadow-blue-900/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#1d4ed8_0%,#020617_55%)]" />
            <div className="relative space-y-4">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-300">{t("public.previewAiSupervisorDashboard")}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{t("public.previewHealthScore", { score: formatNumber(84) })}</p>
                <p className="mt-1 text-sm text-slate-300">{t("public.previewAlerts", { count: formatNumber(12) })}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                  <p className="text-xs text-slate-400">{t("public.previewJobsToday")}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatNumber(27)}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                  <p className="text-xs text-slate-400">{t("public.previewInvoicesPending")}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatNumber(9)}</p>
                </div>
              </div>
              <p className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
                {t("public.previewMockNote")}
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="mt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">{t("public.navFeatures")}</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">{t("public.featuresTitle")}</h2>
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
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">{t("public.navAiSupervisor")}</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950">{t("public.aiSupervisorTitle")}</h2>
          <p className="mt-3 max-w-3xl text-slate-600">
            {t("public.aiSupervisorCopy")}
          </p>
        </section>

        <section className="mt-20" aria-label="Workflow">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">{t("public.howItWorks")}</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">{t("public.workflowTitle")}</h2>
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
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">{t("public.portals")}</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">{t("public.portalsTitle")}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">{t("public.portalAdminTitle")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("public.portalAdminCopy")}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">{t("public.portalEmployeeTitle")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("public.portalEmployeeCopy")}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">{t("public.portalCustomerTitle")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("public.portalCustomerCopy")}</p>
            </article>
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-slate-200 bg-white p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">{t("public.socialProof")}</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">{t("public.testimonialsTitle")}</h2>
          <p className="mt-3 text-slate-600">{t("public.testimonialsSubtitle")}</p>
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
          <h2 className="text-3xl font-semibold">{t("public.operateWithConfidence")}</h2>
          <p className="mt-3 max-w-2xl text-blue-100">
            {t("public.finalCtaCopy")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t("public.startFreeTrial")}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl border border-blue-100 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t("public.viewPricing")}
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center rounded-xl border border-blue-100 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t("public.navExploreDemo")}
            </Link>
          </div>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
