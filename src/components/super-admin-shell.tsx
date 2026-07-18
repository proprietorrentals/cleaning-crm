"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ServiceOSLogo } from "@/components/serviceos-logo";

type SuperAdminNavItem = {
  label: string;
  href: string;
  icon: string;
  isActive: (pathname: string) => boolean;
};

const SUPER_ADMIN_NAV_ITEMS: SuperAdminNavItem[] = [
  {
    label: "Analytics",
    href: "/super-admin",
    icon: "[]",
    isActive: (pathname) => pathname === "/super-admin",
  },
  {
    label: "AI Workforce",
    href: "/super-admin/ai-workforce",
    icon: "AI",
    isActive: (pathname) =>
      pathname === "/super-admin/ai-workforce" ||
      pathname.startsWith("/super-admin/ai-workforce/"),
  },
  {
    label: "Command Center",
    href: "/super-admin/command-center",
    icon: "CC",
    isActive: (pathname) => pathname === "/super-admin/command-center",
  },
  {
    label: "Lead Marketplace",
    href: "/super-admin/lead-marketplace",
    icon: "LM",
    isActive: (pathname) => pathname === "/super-admin/lead-marketplace",
  },
];

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-800 bg-slate-950/95 px-5 py-6 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r lg:px-6">
          <ServiceOSLogo
            variant="horizontal"
            surface="dark"
            size="compact-sidebar"
            subtitle="Super Admin"
          />

          <nav className="mt-8 space-y-1">
            {SUPER_ADMIN_NAV_ITEMS.map((item) => {
              const active = item.isActive(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-cyan-500 text-slate-950 shadow-sm"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-current/30 text-[11px] font-bold">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="flex-1">{children}</section>
      </div>
    </div>
  );
}
