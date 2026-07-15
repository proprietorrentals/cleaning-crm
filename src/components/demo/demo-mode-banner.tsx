"use client";

import Link from "next/link";
import { useDemoSession } from "@/components/demo/demo-session-provider";
import { useI18n } from "@/components/i18n-provider";

export function DemoModeBanner() {
  const { data, resetDemo } = useDemoSession();
  const { t } = useI18n();

  const completedMilestones = [
    data.quoteApproved,
    data.employeeJobCompleted,
    data.invoicePaid,
  ].filter(Boolean).length;
  const progressPercent = (completedMilestones / 3) * 100;

  return (
    <div className="sticky top-[68px] z-30 border-b border-sky-200 bg-sky-50/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-sky-950">
            {t("public.demoModeBannerMessage")}
          </p>
          <div className="mt-2 h-1.5 w-full max-w-lg overflow-hidden rounded-full bg-sky-200/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-600 to-blue-700 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/pricing#founding-partners"
            className="inline-flex items-center justify-center rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-sm hover:bg-sky-100"
          >
            {t("public.demoCtaFounderPricing")}
          </Link>
          <button
            type="button"
            onClick={resetDemo}
            className="inline-flex items-center justify-center rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-sm hover:bg-sky-100"
          >
            {t("public.demoResetDemo")}
          </button>
          <Link
            href="/signup?source=free_trial"
            className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            {t("public.startFreeTrial")}
          </Link>
        </div>
      </div>
    </div>
  );
}
