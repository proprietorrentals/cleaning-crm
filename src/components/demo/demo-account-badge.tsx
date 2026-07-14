"use client";

import { useI18n } from "@/components/i18n-provider";

export function DemoAccountBadge() {
  const { t } = useI18n();

  return (
    <span className="demo-badge-pulse inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
      {t("public.demoAccountBadge")}
    </span>
  );
}
