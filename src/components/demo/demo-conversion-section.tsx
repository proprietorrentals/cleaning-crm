"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

const conversionPointKeys = [
  "public.demoConversionNoCard",
  "public.demoConversionSetUpFast",
  "public.demoConversionDataMigration",
  "public.demoConversionWhiteGloveOnboarding",
  "public.demoConversionPortalsIncluded",
  "public.demoConversionFounderPricing",
];

const testimonialKeys = [
  {
    quoteKey: "public.demoTestimonial1Quote",
    nameKey: "public.demoTestimonial1Name",
    roleKey: "public.demoTestimonial1Role",
  },
  {
    quoteKey: "public.demoTestimonial2Quote",
    nameKey: "public.demoTestimonial2Name",
    roleKey: "public.demoTestimonial2Role",
  },
  {
    quoteKey: "public.demoTestimonial3Quote",
    nameKey: "public.demoTestimonial3Name",
    roleKey: "public.demoTestimonial3Role",
  },
];

const closePlan = {
  en: [
    "Keep your current process running while we configure ServiceOS",
    "Launch with admin, employee, and customer access in one rollout",
    "Use onboarding call scripts to activate your first 10 accounts quickly",
  ],
  es: [
    "Mantiene tu proceso actual mientras configuramos ServiceOS",
    "Lanza admin, empleado y portal de cliente en un solo despliegue",
    "Usa guiones de onboarding para activar tus primeras 10 cuentas rapido",
  ],
};

const urgencyNotes = {
  en: "Founder Partner onboarding slots are limited each month to protect implementation quality.",
  es: "Los cupos mensuales de onboarding Founder Partner son limitados para mantener alta calidad de implementacion.",
};

export function DemoConversionSection() {
  const { t, locale } = useI18n();
  const language = locale === "es" ? "es" : "en";
  const plan = closePlan[language];

  return (
    <section className="demo-elevated mt-12 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-500 p-6 text-white shadow-[0_18px_48px_rgba(37,99,235,0.2)] sm:p-8">
      <div className="rounded-2xl border border-white/30 bg-slate-950/25 px-4 py-3 text-sm font-medium text-blue-50">
        {urgencyNotes[language]}
      </div>

      <h2 className="text-2xl font-semibold sm:text-3xl">
        {t("public.demoConversionTitle")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-blue-50 sm:text-base">
        {t("public.demoConversionSubtitle")}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {conversionPointKeys.map((pointKey) => (
          <p
            key={pointKey}
            className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm backdrop-blur"
          >
            {t(pointKey)}
          </p>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/25 bg-white/10 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
          {language === "en"
            ? "How we remove launch friction"
            : "Como reducimos friccion en el lanzamiento"}
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {plan.map((item) => (
            <p
              key={item}
              className="rounded-xl border border-white/20 bg-slate-950/25 px-3 py-2 text-sm text-blue-50"
            >
              {item}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-7 rounded-2xl border border-white/20 bg-slate-950/20 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
          {t("public.demoTestimonialsEyebrow")}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {testimonialKeys.map((item) => (
            <article
              key={item.quoteKey}
              className="rounded-xl border border-white/20 bg-white/10 p-4"
            >
              <p className="text-sm leading-6 text-white/95">
                {t(item.quoteKey)}
              </p>
              <p className="mt-3 text-sm font-semibold text-white">
                {t(item.nameKey)}
              </p>
              <p className="text-xs text-blue-100">{t(item.roleKey)}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/signup?source=demo-conversion"
          className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
        >
          {t("public.startFreeTrial")}
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-slate-950/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-950/40"
        >
          {t("public.demoCtaBookOnboardingCall")}
        </Link>
        <Link
          href="/pricing#founding-partners"
          className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          {t("public.demoCtaFounderPricing")}
        </Link>
      </div>
      <p className="mt-3 text-xs text-blue-100">
        {t("public.demoConversionFinePrint")}
      </p>
      <p className="mt-1 text-xs text-blue-100/90">
        {language === "en"
          ? "No long-term contract required to start your Founder workspace."
          : "No se requiere contrato a largo plazo para iniciar tu espacio Founder."}
      </p>
    </section>
  );
}
