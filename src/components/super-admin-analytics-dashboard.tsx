"use client";

import { useMemo, useState } from "react";
import { PLATFORM_CONVERSION_EVENTS, type PlatformEventName } from "@/lib/platform-events";

type DateRange = "today" | "7d" | "30d";

type PlatformEventRow = {
  id: string;
  event_name: PlatformEventName;
  event_source: string;
  page_path: string | null;
  created_at: string;
};

type SuperAdminAnalyticsDashboardProps = {
  userEmail: string | null | undefined;
  projectHostname: string;
  companiesCount: number;
  usersCount: number | null;
  demoRequestsCount: number;
  foundingPartnerCount: number;
  userCountUnavailable: boolean;
  vercelDashboardUrl: string;
  events: PlatformEventRow[];
};

const DATE_RANGE_OPTIONS: Array<{ value: DateRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

function getRangeStart(range: DateRange) {
  const now = new Date();

  if (range === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const days = range === "7d" ? 7 : 30;
  return new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
}

function formatDay(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildSeries(events: PlatformEventRow[], range: DateRange) {
  const start = getRangeStart(range);
  const now = new Date();
  const dayCount = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const days: Array<{ key: string; label: string; value: number }> = [];

  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    days.push({ key, label: formatDay(date.toISOString()), value: 0 });
  }

  for (const event of events) {
    const eventDate = new Date(event.created_at);
    if (eventDate < start) continue;
    const key = eventDate.toISOString().slice(0, 10);
    const row = days.find((day) => day.key === key);
    if (row) {
      row.value += 1;
    }
  }

  return days;
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return "0.0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export function SuperAdminAnalyticsDashboard({
  userEmail,
  projectHostname,
  companiesCount,
  usersCount,
  demoRequestsCount,
  foundingPartnerCount,
  userCountUnavailable,
  vercelDashboardUrl,
  events,
}: SuperAdminAnalyticsDashboardProps) {
  const [range, setRange] = useState<DateRange>("30d");

  const filteredEvents = useMemo(() => {
    const start = getRangeStart(range);
    return events.filter((event) => new Date(event.created_at) >= start);
  }, [events, range]);

  const countsByEvent = useMemo(() => {
    const map = new Map<PlatformEventName, number>();
    for (const event of filteredEvents) {
      map.set(event.event_name, (map.get(event.event_name) ?? 0) + 1);
    }
    return map;
  }, [filteredEvents]);

  const conversionTotal = useMemo(() => {
    return PLATFORM_CONVERSION_EVENTS.reduce((sum, eventName) => sum + (countsByEvent.get(eventName) ?? 0), 0);
  }, [countsByEvent]);

  const trendSeries = useMemo(() => buildSeries(filteredEvents, range), [filteredEvents, range]);
  const maxSeriesValue = Math.max(...trendSeries.map((item) => item.value), 1);

  const topPages = useMemo(() => {
    const pageCounts = new Map<string, number>();
    for (const event of filteredEvents) {
      if (!event.page_path) continue;
      pageCounts.set(event.page_path, (pageCounts.get(event.page_path) ?? 0) + 1);
    }

    return [...pageCounts.entries()]
      .map(([pagePath, count]) => ({ pagePath, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredEvents]);

  const recentActivity = useMemo(() => {
    return filteredEvents
      .slice()
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 16);
  }, [filteredEvents]);

  const funnel = [
    { label: "Homepage views", count: countsByEvent.get("homepage_viewed") ?? 0 },
    { label: "Pricing views", count: countsByEvent.get("pricing_viewed") ?? 0 },
    { label: "Interactive demo opens", count: countsByEvent.get("interactive_demo_opened") ?? 0 },
    {
      label: "Lead intent actions",
      count:
        (countsByEvent.get("book_demo_clicked") ?? 0) +
        (countsByEvent.get("free_trial_clicked") ?? 0) +
        (countsByEvent.get("contact_form_submitted") ?? 0) +
        (countsByEvent.get("demo_request_submitted") ?? 0) +
        (countsByEvent.get("founding_partner_application_submitted") ?? 0),
    },
    { label: "Leads marked won", count: countsByEvent.get("lead_marked_won") ?? 0 },
  ];

  const funnelBaseline = funnel[0]?.count ?? 0;

  const metricCards = [
    {
      label: "Conversions tracked",
      value: conversionTotal.toLocaleString(),
      detail: `${range.toUpperCase()} first-party conversion events`,
    },
    {
      label: "Interactive demo opens",
      value: (countsByEvent.get("interactive_demo_opened") ?? 0).toLocaleString(),
      detail: "Demo interest signal",
    },
    {
      label: "Book demo clicks",
      value: (countsByEvent.get("book_demo_clicked") ?? 0).toLocaleString(),
      detail: "Sales CTA clicks",
    },
    {
      label: "Free trial clicks",
      value: (countsByEvent.get("free_trial_clicked") ?? 0).toLocaleString(),
      detail: "Self-serve CTA clicks",
    },
    {
      label: "Contact forms submitted",
      value: (countsByEvent.get("contact_form_submitted") ?? 0).toLocaleString(),
      detail: "General inbound interest",
    },
    {
      label: "Demo requests submitted",
      value: (countsByEvent.get("demo_request_submitted") ?? 0).toLocaleString(),
      detail: "High-intent inbound demo forms",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">ServiceOS platform</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Super Admin Analytics</h1>
            <p className="mt-1 text-sm text-slate-400">Signed in as {userEmail ?? "-"}</p>
            <p className="mt-1 text-xs text-slate-500">Project: {projectHostname}</p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-900 p-1">
            {DATE_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  range === option.value ? "bg-cyan-500 text-slate-950" : "text-slate-300 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total companies</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">{companiesCount.toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-500">Source: tenants</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total users</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">{usersCount?.toLocaleString() ?? "Unavailable"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {userCountUnavailable ? "Source unavailable: super_admin_total_users()" : "Source: super_admin_total_users()"}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Demo requests</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">{demoRequestsCount.toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-500">Source: sales_leads.source = demo_request</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Founding partner apps</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">{foundingPartnerCount.toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-500">Source: sales_leads.source OR founding_partner_interest</p>
          </article>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Website traffic source</h2>
          <p className="mt-2 text-sm text-slate-400">
            Vercel Web Analytics is active in the app layout. Traffic reporting lives in Vercel, while this dashboard focuses on first-party conversion events.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-300">Status: Enabled</span>
            <a
              href={vercelDashboardUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Open Vercel Analytics Dashboard
            </a>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((metric) => (
            <article key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</p>
              <p className="mt-2 text-3xl font-bold text-cyan-300">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="mb-8 grid gap-4 lg:grid-cols-5">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-3">
            <h2 className="text-lg font-semibold">Conversion trend by day</h2>
            <p className="mt-1 text-sm text-slate-400">Platform events ingested by date for the selected range.</p>
            <div className="mt-5 flex items-end gap-2">
              {trendSeries.map((point) => (
                <div key={point.key} className="flex min-h-40 flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-full rounded-t-md bg-cyan-500/80"
                    style={{
                      height: `${Math.max((point.value / maxSeriesValue) * 130, point.value > 0 ? 8 : 2)}px`,
                    }}
                    title={`${point.label}: ${point.value}`}
                  />
                  <p className="text-[11px] text-slate-400">{point.label}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold">Top pages</h2>
            <p className="mt-1 text-sm text-slate-400">Most active paths for tracked events.</p>
            <div className="mt-4 space-y-2">
              {topPages.length === 0 ? (
                <p className="text-sm text-slate-500">No page activity tracked yet in this range.</p>
              ) : (
                topPages.map((page) => (
                  <div key={page.pagePath} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
                    <span className="max-w-[70%] truncate text-slate-300">{page.pagePath}</span>
                    <span className="font-semibold text-cyan-300">{page.count}</span>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="mb-8 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Conversion funnel</h2>
            <p className="mt-1 text-sm text-slate-400">Simple progression from awareness to won leads.</p>
            <div className="mt-4 space-y-3">
              {funnel.map((step) => (
                <div key={step.label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-200">{step.label}</p>
                    <p className="text-sm font-semibold text-cyan-300">{step.count.toLocaleString()}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{percent(step.count, funnelBaseline)} of homepage baseline</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Event breakdown</h2>
            <p className="mt-1 text-sm text-slate-400">Counts by allowlisted event type.</p>
            <div className="mt-4 space-y-2">
              {(Object.entries(Object.fromEntries(countsByEvent)) as Array<[PlatformEventName, number]>)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
                    <span className="text-slate-300">{name}</span>
                    <span className="font-semibold text-cyan-300">{count.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Recent platform activity</h2>
          <p className="mt-1 text-sm text-slate-400">Latest first-party event stream for the selected date range.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="pb-3 pr-4 font-medium">Time</th>
                  <th className="pb-3 pr-4 font-medium">Event</th>
                  <th className="pb-3 pr-4 font-medium">Path</th>
                  <th className="pb-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentActivity.map((event) => (
                  <tr key={event.id}>
                    <td className="py-2 pr-4 text-slate-300">{new Date(event.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-cyan-300">{event.event_name}</td>
                    <td className="max-w-[340px] truncate py-2 pr-4 text-slate-300">{event.page_path ?? "-"}</td>
                    <td className="py-2 text-slate-400">{event.event_source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentActivity.length === 0 ? <p className="pt-4 text-sm text-slate-500">No recent activity in this range.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}