"use client";

import Link from "next/link";
import { PublicSiteNav } from "@/components/public-site-nav";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { ServiceOSLogo } from "@/components/serviceos-logo";
import { useI18n } from "@/components/i18n-provider";

function tick(value: string, includedLabel: string) {
  return value === includedLabel ? (
    <span className="inline-flex items-center gap-2 text-emerald-700">
      <span className="text-emerald-500">✓</span>
      <span>{value}</span>
    </span>
  ) : (
    <span className="text-slate-500">{value}</span>
  );
}

export function PricingPageContent() {
  const { t, locale } = useI18n();

  const planCards = [
    {
      name: t("public.pricingStarterName"),
      priceMonthly: new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(99),
      badge: t("public.pricingStarterBadge"),
      description: t("public.pricingStarterDescription"),
      features: [
        t("public.pricingFeatureCrm"),
        t("public.pricingFeatureCustomers"),
        t("public.pricingFeatureQuotes"),
        t("public.pricingFeatureJobs"),
        t("public.pricingFeatureInvoices"),
      ],
      highlighted: false,
      cta: t("public.startFreeTrial"),
      ctaHref: "/signup",
      ctaSecondary: "",
      ctaSecondaryHref: "",
    },
    {
      name: t("public.pricingProfessionalName"),
      priceMonthly: new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(199),
      badge: t("public.pricingProfessionalBadge"),
      description: t("public.pricingProfessionalDescription"),
      features: [
        t("public.pricingFeatureEverythingStarter"),
        t("public.pricingFeatureAiSupervisor"),
        t("public.pricingFeatureWebsiteBuilder"),
        t("public.pricingFeatureEmployeePortal"),
        t("public.pricingFeatureCustomerPortal"),
        t("public.pricingFeatureAiReports"),
        t("public.pricingFeatureMileage"),
        t("public.pricingFeaturePhotos"),
        t("public.pricingFeatureSignatures"),
        t("public.pricingFeatureStripe"),
        t("public.pricingFeatureHealthDashboard"),
      ],
      highlighted: true,
      cta: t("public.bookDemo"),
      ctaHref: "/contact",
      ctaSecondary: t("public.startFreeTrial"),
      ctaSecondaryHref: "/signup",
    },
    {
      name: t("public.pricingEnterpriseName"),
      priceMonthly: t("public.pricingContactSales"),
      badge: t("public.pricingEnterpriseBadge"),
      description: t("public.pricingEnterpriseDescription"),
      features: [
        t("public.pricingFeatureMultiLocation"),
        t("public.pricingFeatureAdvancedPermissions"),
        t("public.pricingFeaturePrioritySupport"),
        t("public.pricingFeatureCustomOnboarding"),
        t("public.pricingFeatureApiReadiness"),
      ],
      highlighted: false,
      cta: t("public.talkToSales"),
      ctaHref: "/contact",
      ctaSecondary: "",
      ctaSecondaryHref: "",
    },
  ];

  const included = t("public.pricingIncluded");
  const comparisonRows = [
    { label: t("public.cmpCore"), starter: included, professional: included, enterprise: included },
    { label: t("public.cmpAiSupervisor"), starter: t("public.notIncluded"), professional: included, enterprise: included },
    { label: t("public.cmpWebsiteBuilder"), starter: t("public.notIncluded"), professional: included, enterprise: included },
    { label: t("public.cmpEmployeePortal"), starter: t("public.notIncluded"), professional: included, enterprise: included },
    { label: t("public.cmpCustomerPortal"), starter: t("public.notIncluded"), professional: included, enterprise: included },
    { label: t("public.cmpAiReports"), starter: t("public.notIncluded"), professional: included, enterprise: included },
    { label: t("public.cmpMileage"), starter: t("public.notIncluded"), professional: included, enterprise: included },
    { label: t("public.cmpPhotosSignatures"), starter: t("public.notIncluded"), professional: included, enterprise: included },
    { label: t("public.cmpStripe"), starter: t("public.notIncluded"), professional: included, enterprise: included },
    { label: t("public.cmpHealthDashboard"), starter: t("public.notIncluded"), professional: included, enterprise: included },
    { label: t("public.cmpMultiLocation"), starter: t("public.notIncluded"), professional: t("public.notIncluded"), enterprise: included },
    { label: t("public.cmpOnboarding"), starter: t("public.notIncluded"), professional: t("public.notIncluded"), enterprise: included },
  ];

  const faqs = [
    { question: t("public.faqCancelQ"), answer: t("public.faqCancelA") },
    { question: t("public.faqTrialQ"), answer: t("public.faqTrialA") },
    { question: t("public.faqUpgradeQ"), answer: t("public.faqUpgradeA") },
    { question: t("public.faqOnboardingQ"), answer: t("public.faqOnboardingA") },
  ];

  const highlights = [
    { label: t("public.pricingHighlightConnectedOpsLabel"), value: t("public.pricingHighlightConnectedOpsValue") },
    { label: t("public.pricingHighlightBuiltGrowthLabel"), value: t("public.pricingHighlightBuiltGrowthValue") },
    { label: t("public.pricingHighlightSupportLabel"), value: t("public.pricingHighlightSupportValue") },
    { label: t("public.pricingHighlightProfessionalLabel"), value: t("public.pricingHighlightProfessionalValue") },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#edf5ff_0%,#f8fbff_44%,#f3f7fb_100%)] text-slate-900">
      <PublicSiteNav active="pricing" />

      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:px-8 sm:py-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                {t("public.navPricing")}
              </div>
              <div className="max-w-2xl">
                <div className="mb-5">
                  <ServiceOSLogo variant="stacked" size="mobile" showTagline />
                </div>
                <h1 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">{t("public.pricingHeroTitle")}</h1>
                <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{t("public.pricingHeroCopy")}</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/contact" className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                  {t("public.bookDemo")}
                </Link>
                <Link href="/signup" className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                  {t("public.startFreeTrial")}
                </Link>
              </div>
            </div>

            <div className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-1">
              {highlights.map((item) => (
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
            <article key={plan.name} className={`relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-white p-6 shadow-sm transition ${plan.highlighted ? "border-blue-300 ring-2 ring-blue-200 shadow-[0_24px_50px_rgba(37,99,235,0.12)]" : "border-slate-200"}`}>
              {plan.highlighted ? <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" /> : null}
              <div className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${plan.highlighted ? "bg-blue-50 text-blue-700" : plan.name === t("public.pricingEnterpriseName") ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
                {plan.badge}
              </div>
              <div className="mt-4">
                <h2 className="text-2xl font-semibold text-slate-950">{plan.name}</h2>
                <p className={`mt-2 rounded-2xl px-4 py-3 text-sm leading-6 ${plan.highlighted ? "bg-blue-50 text-blue-950" : "bg-slate-50 text-slate-700"}`}>{plan.description}</p>
              </div>

              <div className="mt-6 flex items-end gap-2">
                <p className={`text-5xl font-semibold ${plan.highlighted ? "text-blue-700" : "text-slate-950"}`}>{plan.priceMonthly}</p>
                <p className="pb-1 text-sm text-slate-500">/ {t("public.month")}</p>
              </div>
              <p className="mt-2 text-sm text-slate-500">{t("public.pricingNoAnnual")}</p>

              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3">
                <Link href={plan.ctaHref} className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${plan.highlighted ? "bg-blue-700 hover:bg-blue-800" : plan.name === t("public.pricingEnterpriseName") ? "bg-slate-950 hover:bg-slate-800" : "bg-slate-800 hover:bg-slate-900"}`}>
                  {plan.cta}
                </Link>
                {plan.ctaSecondary ? (
                  <Link href={plan.ctaSecondaryHref} className="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                    {plan.ctaSecondary}
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-16 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">{t("public.featureComparison")}</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">{t("public.featureComparisonTitle")}</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">{t("public.featureComparisonSubtitle")}</p>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="min-w-[760px] w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">{t("public.feature")}</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">{t("public.pricingStarterName")}</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium text-blue-700">{t("public.pricingProfessionalName")}</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-medium">{t("public.pricingEnterpriseName")}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, index) => (
                  <tr key={row.label} className={index % 2 === 0 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="border-b border-slate-100 px-4 py-4 font-medium text-slate-900">{row.label}</td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-600">{tick(row.starter, included)}</td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-600">{tick(row.professional, included)}</td>
                    <td className="border-b border-slate-100 px-4 py-4 text-slate-600">{tick(row.enterprise, included)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-blue-200 bg-gradient-to-br from-blue-700 via-sky-600 to-cyan-500 p-8 text-white shadow-[0_20px_60px_rgba(37,99,235,0.18)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">{t("public.whyProfessional")}</p>
            <h2 className="mt-3 text-3xl font-semibold">{t("public.whyProfessionalTitle")}</h2>
            <p className="mt-4 text-sm leading-6 text-blue-50">{t("public.whyProfessionalCopy")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
                {t("public.bookDemo")}
              </Link>
              <Link href="/signup" className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                {t("public.startFreeTrial")}
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">{t("public.frequentlyAskedQuestions")}</p>
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
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">{t("public.readyToSeeLive")}</p>
              <h2 className="mt-2 text-3xl font-semibold">{t("public.operateWithConfidence")}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{t("public.pricingFinalCtaCopy")}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                {t("public.bookDemo")}
              </Link>
              <Link href="/signup" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
                {t("public.startFreeTrial")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
