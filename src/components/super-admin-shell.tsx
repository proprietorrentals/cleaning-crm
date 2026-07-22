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

type SuperAdminNavSection = {
  title: string;
  items: SuperAdminNavItem[];
};

const SUPER_ADMIN_NAV_SECTIONS: SuperAdminNavSection[] = [
  {
    title: "Platform",
    items: [
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
    ],
  },
  {
    title: "Lead Operations",
    items: [
      {
        label: "Potential Leads",
        href: "/super-admin/lead-operations/potential-leads",
        icon: "PL",
        isActive: (pathname) =>
          pathname === "/super-admin/lead-operations/potential-leads",
      },
      {
        label: "Verified Leads",
        href: "/super-admin/lead-operations/verified-leads",
        icon: "VL",
        isActive: (pathname) =>
          pathname === "/super-admin/lead-operations/verified-leads",
      },
      {
        label: "Marketplace",
        href: "/super-admin/lead-marketplace",
        icon: "LM",
        isActive: (pathname) => pathname === "/super-admin/lead-marketplace",
      },
      {
        label: "Lead Discovery",
        href: "/super-admin/lead-operations/lead-discovery",
        icon: "LD",
        isActive: (pathname) =>
          pathname === "/super-admin/lead-operations/lead-discovery",
      },
      {
        label: "Research Queue",
        href: "/super-admin/lead-operations/research-queue",
        icon: "RQ",
        isActive: (pathname) =>
          pathname === "/super-admin/lead-operations/research-queue",
      },
    ],
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

          <nav className="mt-8 space-y-4">
            {SUPER_ADMIN_NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
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
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="flex-1">{children}</section>
      </div>
    </div>
  );
}
