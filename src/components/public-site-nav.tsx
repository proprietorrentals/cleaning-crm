"use client";

import Link from "next/link";
import { ServiceOSLogo } from "@/components/serviceos-logo";
import { useI18n } from "@/components/i18n-provider";

type PublicSiteNavProps = {
  active?: "home" | "pricing" | "contact";
};

function linkClass(isActive: boolean) {
  return isActive
    ? "text-blue-700"
    : "text-slate-700 hover:text-blue-700";
}

export function PublicSiteNav({ active }: PublicSiteNavProps) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-blue-100/70 bg-white/85 backdrop-blur">
      <nav aria-label="Primary" className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <ServiceOSLogo variant="horizontal" size="mobile" showTagline />
          </Link>
          <Link
            href="/login"
            className="inline-flex rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-700 lg:hidden"
          >
            {t("public.navLogin")}
          </Link>
        </div>

        <ul className="mt-3 flex items-center gap-4 overflow-x-auto whitespace-nowrap pb-1 text-sm font-medium text-slate-700 lg:hidden">
          <li>
            <Link href="/" className={linkClass(active === "home")}>
              {t("public.navHome")}
            </Link>
          </li>
          <li>
            <Link href="/#features" className="hover:text-blue-700">
              {t("public.navFeatures")}
            </Link>
          </li>
          <li>
            <Link href="/#ai-supervisor" className="hover:text-blue-700">
              {t("public.navAiSupervisor")}
            </Link>
          </li>
          <li>
            <Link href="/pricing" className={linkClass(active === "pricing")}>
              {t("public.navPricing")}
            </Link>
          </li>
          <li>
            <Link href="/explore" className="hover:text-blue-700">
              {t("public.navExploreDemo")}
            </Link>
          </li>
          <li>
            <Link href="/contact" className={linkClass(active === "contact")}>
              {t("public.navContact")}
            </Link>
          </li>
        </ul>

        <ul className="hidden items-center gap-6 text-sm font-medium lg:flex">
          <li>
            <Link href="/" className={linkClass(active === "home")}>
              {t("public.navHome")}
            </Link>
          </li>
          <li>
            <Link href="/#features" className="text-slate-700 hover:text-blue-700">
              {t("public.navFeatures")}
            </Link>
          </li>
          <li>
            <Link href="/#ai-supervisor" className="text-slate-700 hover:text-blue-700">
              {t("public.navAiSupervisor")}
            </Link>
          </li>
          <li>
            <Link href="/pricing" className={linkClass(active === "pricing")}>
              {t("public.navPricing")}
            </Link>
          </li>
          <li>
            <Link href="/explore" className="text-slate-700 hover:text-blue-700">
              {t("public.navExploreDemo")}
            </Link>
          </li>
          <li>
            <Link href="/contact" className={linkClass(active === "contact")}>
              {t("public.navContact")}
            </Link>
          </li>
          <li>
            <Link href="/login" className="text-slate-700 hover:text-blue-700">
              {t("public.navLogin")}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
