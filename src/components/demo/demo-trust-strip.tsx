"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

const trustMetricKeys = [
  {
    labelKey: "public.demoTrustMetricTimeToValueLabel",
    valueKey: "public.demoTrustMetricTimeToValueValue",
  },
  {
    labelKey: "public.demoTrustMetricCollectionLabel",
    valueKey: "public.demoTrustMetricCollectionValue",
  },
  {
    labelKey: "public.demoTrustMetricRetentionLabel",
    valueKey: "public.demoTrustMetricRetentionValue",
  },
];

const trustBadgeKeys = [
  "public.demoTrustBadgeRolePermissions",
  "public.demoTrustBadgeStripe",
  "public.demoTrustBadgeAuditTrail",
  "public.demoTrustBadgeSupport",
];

const credibilityCards = {
  en: [
    {
      title: "Founder Partner onboarding",
      body: "Hands-on launch with migration guidance and role-by-role setup checklists.",
    },
    {
      title: "Commercial cleaning focused",
      body: "Workflows are tuned for recurring facilities, inspections, and proof-of-service.",
    },
    {
      title: "Owner-visible operations",
      body: "Track jobs, quality, and collections from one dashboard without chasing text updates.",
    },
  ],
  es: [
    {
      title: "Onboarding Founder Partner",
      body: "Lanzamiento guiado con apoyo de migracion y checklists por rol.",
    },
    {
      title: "Enfocado en limpieza comercial",
      body: "Flujos adaptados para servicios recurrentes, inspecciones y evidencia de servicio.",
    },
    {
      title: "Operacion visible para el propietario",
      body: "Sigue trabajos, calidad y cobros desde un solo panel sin perseguir mensajes.",
    },
  ],
};

const rolloutSteps = {
  en: [
    "Day 1-2: import customers and active contracts",
    "Day 3-5: configure team roles and recurring schedules",
    "Week 2: launch customer portal and payment flows",
  ],
  es: [
    "Dia 1-2: importar clientes y contratos activos",
    "Dia 3-5: configurar roles del equipo y agendas recurrentes",
    "Semana 2: lanzar portal de clientes y cobros",
  ],
};

export function DemoTrustStrip() {
  const { t, locale } = useI18n();
  const language = locale === "es" ? "es" : "en";
  const cards = credibilityCards[language];
  const steps = rolloutSteps[language];

  return (
    <section className="demo-elevated mt-6 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            {t("public.demoTrustEyebrow")}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">
            {t("public.demoTrustTitle")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {language === "en"
              ? "Built for owners who need accountability in the field, cleaner customer communication, and faster invoice collection."
              : "Creado para propietarios que necesitan responsabilidad en campo, mejor comunicacion con clientes y cobro mas rapido."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/signup?source=free_trial"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t("public.demoCtaStartFounderWorkspace")}
          </Link>
          <Link
            href="/contact?source=demo_request"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700"
          >
            {t("public.demoTrustBookCall")}
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {trustMetricKeys.map((metric) => (
          <article
            key={metric.labelKey}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-2xl font-semibold text-slate-950">
              {t(metric.valueKey)}
            </p>
            <p className="mt-1 text-sm text-slate-600">{t(metric.labelKey)}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-sm font-semibold text-slate-900">{card.title}</p>
            <p className="mt-1 text-sm text-slate-600">{card.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
          {language === "en"
            ? "Typical rollout timeline"
            : "Cronograma tipico de lanzamiento"}
        </p>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {steps.map((step) => (
            <p
              key={step}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {step}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {trustBadgeKeys.map((badgeKey) => (
          <span
            key={badgeKey}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
          >
            {t(badgeKey)}
          </span>
        ))}
      </div>
    </section>
  );
}
