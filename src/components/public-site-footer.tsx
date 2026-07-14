"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { ServiceOSLogo } from "@/components/serviceos-logo";

export function PublicSiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-2">
          <ServiceOSLogo variant="horizontal" size="mobile" />
          <p>{t("public.footerTagline")}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/" className="hover:text-blue-700">
            {t("public.navHome")}
          </Link>
          <Link href="/pricing" className="hover:text-blue-700">
            {t("public.navPricing")}
          </Link>
          <Link href="/demo" className="hover:text-blue-700">
            {t("public.navExploreDemo")}
          </Link>
          <Link href="/contact" className="hover:text-blue-700">
            {t("public.navContact")}
          </Link>
          <Link href="/login" className="hover:text-blue-700">
            {t("public.navLogin")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
