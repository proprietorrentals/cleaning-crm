"use client";

import Link from "next/link";
import { DemoAccountBadge } from "@/components/demo/demo-account-badge";
import { useI18n } from "@/components/i18n-provider";
import { demoCompany } from "@/lib/demo-fixtures";

const portalCards = [
  {
    titleKey: "public.demoPortalOwnerTitle",
    descriptionKey: "public.demoPortalOwnerDescription",
    buttonKey: "public.demoPortalOwnerButton",
    href: "/demo/admin",
  },
  {
    titleKey: "public.demoPortalEmployeeTitle",
    descriptionKey: "public.demoPortalEmployeeDescription",
    buttonKey: "public.demoPortalEmployeeButton",
    href: "/demo/employee",
  },
  {
    titleKey: "public.demoPortalCustomerTitle",
    descriptionKey: "public.demoPortalCustomerDescription",
    buttonKey: "public.demoPortalCustomerButton",
    href: "/demo/customer",
  },
];

const socialProof = {
  en: {
    eyebrow:
      "Built for commercial cleaning owners scaling from chaos to control",
    urgency:
      "Founder Partner seats are released in small cohorts for hands-on onboarding.",
    noRisk:
      "No card required. Keep your current workflow live while ServiceOS is configured.",
    trustPoints: [
      "Role-based portals for owners, field teams, and customers",
      "Photo proof + checklists tied directly to invoices",
      "Guided migration for existing accounts and recurring jobs",
    ],
  },
  es: {
    eyebrow:
      "Creado para propietarios de limpieza comercial que buscan control real",
    urgency:
      "Los cupos Founder Partner se liberan por cohortes pequenas con onboarding personalizado.",
    noRisk:
      "Sin tarjeta. Mantienes tu flujo actual mientras configuramos ServiceOS.",
    trustPoints: [
      "Portales por rol para propietarios, equipo de campo y clientes",
      "Evidencia fotografica + checklist conectados a facturacion",
      "Migracion guiada para cuentas actuales y trabajos recurrentes",
    ],
  },
};

export function DemoLandingPage() {
  const { t, locale } = useI18n();
  const language = locale === "es" ? "es" : "en";
  const proof = socialProof[language];

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm font-medium text-blue-900">
          {proof.urgency}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DemoAccountBadge />
          <span className="demo-badge-pulse rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {t("public.demoPublicWalkthrough")}
          </span>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
          {proof.eyebrow}
        </p>

        <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
          {t("public.demoLandingTitle")}
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600 sm:text-lg">
          {t("public.demoLandingSubtitle")}
        </p>

        <div className="mt-7 grid gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-950 sm:grid-cols-2 lg:grid-cols-4">
          <p>
            <span className="font-semibold">
              {t("public.demoLabelCompany")}:
            </span>{" "}
            {demoCompany.name}
          </p>
          <p>
            <span className="font-semibold">{t("public.demoLabelOwner")}:</span>{" "}
            {demoCompany.owner}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelServiceArea")}:
            </span>{" "}
            {demoCompany.serviceArea}
          </p>
          <p>
            <span className="font-semibold">{t("public.demoLabelPlan")}:</span>{" "}
            {demoCompany.plan}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelTeamSize")}:
            </span>{" "}
            {demoCompany.teamSize}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelActiveCustomers")}:
            </span>{" "}
            {demoCompany.activeCustomers}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelMonthlyRevenue")}:
            </span>{" "}
            {new Intl.NumberFormat(locale, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(demoCompany.monthlyRevenue)}
          </p>
          <p>
            <span className="font-semibold">
              {t("public.demoLabelCompletionRate")}:
            </span>{" "}
            {demoCompany.completionRate}%
          </p>
          <p>
            <span className="font-semibold">{t("public.demoLabelPhone")}:</span>{" "}
            {demoCompany.phone}
          </p>
          <p className="sm:col-span-2 lg:col-span-3">
            <span className="font-semibold">{t("public.demoLabelEmail")}:</span>{" "}
            {demoCompany.email}
          </p>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {proof.trustPoints.map((point) => (
            <p
              key={point}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              {point}
            </p>
          ))}
        </div>

        <div className="mt-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/demo/tour"
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 hover:shadow-[0_14px_28px_rgba(15,23,42,0.2)]"
            >
              {t("public.demoStartTour")}
            </Link>
            <Link
              href="/signup?source=demo-landing"
              className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              {t("public.startFreeTrial")}
            </Link>
            <Link
              href="/pricing#founding-partners"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:text-blue-700"
            >
              {t("public.demoCtaFounderPricing")}
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {t("public.demoLandingProofline")}
          </p>
          <p className="mt-1 text-sm text-slate-500">{proof.noRisk}</p>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {portalCards.map((card) => (
          <article
            key={card.titleKey}
            className="demo-elevated flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-2xl font-semibold text-slate-900">
              {t(card.titleKey)}
            </h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
              {t(card.descriptionKey)}
            </p>
            <Link
              href={card.href}
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 hover:shadow-[0_10px_24px_rgba(37,99,235,0.2)]"
            >
              {t(card.buttonKey)}
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
