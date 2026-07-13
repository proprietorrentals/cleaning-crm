"use client";

import { PublicSiteNav } from "@/components/public-site-nav";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { ContactForm } from "@/app/contact/contact-form";
import { useI18n } from "@/components/i18n-provider";

export function ContactPageContent() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eaf3ff_0%,#f8fbff_45%,#f5f8fc_100%)] text-slate-900">
      <PublicSiteNav active="contact" />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              {t("public.navContact")}
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              {t("public.contactHeroTitle")}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{t("public.contactHeroCopy")}</p>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{t("public.contactWhatNext")}</p>
              <p className="mt-2">1. {t("public.contactStep1")}</p>
              <p>2. {t("public.contactStep2")}</p>
              <p>3. {t("public.contactStep3")}</p>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-950">{t("public.contactFormTitle")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("public.contactFormSubtitle")}</p>
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
