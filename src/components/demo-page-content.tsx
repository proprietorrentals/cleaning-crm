"use client";

import Link from "next/link";
import { useEffect } from "react";
import { DemoVideoEmbed } from "@/components/demo-video-embed";
import { useI18n } from "@/components/i18n-provider";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicSiteNav } from "@/components/public-site-nav";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { isDemoVideoEnabled } from "@/lib/feature-flags";

const DEMO_VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL;

export function DemoPageContent() {
  const { t } = useI18n();

  useEffect(() => {
    trackAnalyticsEvent("demo_video_opened", { source: "demo_page" });
  }, []);

  const features = [
    t("public.demoFeatureAiSupervisor"),
    t("public.demoFeatureQuotesJobs"),
    t("public.demoFeatureProofAndBilling"),
    t("public.demoFeaturePortals"),
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eaf3ff_0%,#f8fbff_45%,#f5f8fc_100%)] text-slate-900">
      <PublicSiteNav active="home" />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              {t("public.demoPageBadge")}
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              {t("public.demoPageTitle")}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              {t("public.demoPageSubtitle")}
            </p>

            <div className="mt-7 space-y-3">
              {features.map((feature) => (
                <p
                  key={feature}
                  className="flex items-start gap-3 text-sm text-slate-700"
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                    ✓
                  </span>
                  <span>{feature}</span>
                </p>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/demo"
                onClick={() =>
                  trackAnalyticsEvent("interactive_demo_opened", {
                    source: "demo_page_cta",
                  })
                }
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {t("public.exploreInteractiveDemo")}
              </Link>
              <Link
                href="/signup?source=free_trial"
                onClick={() =>
                  trackAnalyticsEvent("free_trial_clicked", {
                    source: "demo_page_cta",
                  })
                }
                className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {t("public.startFreeTrial")}
              </Link>
              <Link
                href="/contact?source=demo_request"
                onClick={() =>
                  trackAnalyticsEvent("book_demo_clicked", {
                    source: "demo_page_cta",
                  })
                }
                className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {t("public.bookDemo")}
              </Link>
            </div>
          </div>

          {isDemoVideoEnabled ? (
            <DemoVideoEmbed
              videoUrl={DEMO_VIDEO_URL}
              title={t("public.demoVideoTitle")}
              className="lg:mt-2"
              onCompleted={() =>
                trackAnalyticsEvent("demo_video_completed", {
                  source: "demo_page",
                })
              }
            />
          ) : (
            <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:mt-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                {t("public.demoPageBadge")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {t("public.exploreInteractiveDemo")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {t("public.demoLandingProofline")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/demo/tour"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {t("public.demoStartTour")}
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  {t("public.navExploreDemo")}
                </Link>
              </div>
            </aside>
          )}
        </section>

        <section className="mt-16 rounded-3xl border border-slate-200 bg-white p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            {t("public.demoOverview")}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">
            {t("public.demoOverviewTitle")}
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">
            {t("public.demoOverviewCopy")}
          </p>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
