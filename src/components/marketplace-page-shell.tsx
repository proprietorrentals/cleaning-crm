"use client";

import Link from "next/link";
import { MarketplaceNotificationsButton } from "@/components/marketplace-notifications-button";
import { ServiceOSLogo } from "@/components/serviceos-logo";

type MarketplacePageShellProps = {
  title: string;
  subtitle: string;
  activeTab: "saved-searches" | "notifications";
  children: React.ReactNode;
};

const tabs = [
  {
    label: "Saved Searches",
    href: "/marketplace/saved-searches",
    key: "saved-searches",
  },
  {
    label: "Notification Center",
    href: "/marketplace/notifications",
    key: "notifications",
  },
];

export function MarketplacePageShell({
  title,
  subtitle,
  activeTab,
  children,
}: MarketplacePageShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_54%,_#f8fafc_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-slate-200/80 bg-white/90 px-4 py-4 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <ServiceOSLogo
                variant="horizontal"
                surface="light"
                size="compact-sidebar"
                subtitle="Marketplace"
              />
              <div className="pt-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700/80">
                  Service OS
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                Dashboard
              </Link>
              <MarketplaceNotificationsButton />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const active = tab.key === activeTab;

              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </header>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
