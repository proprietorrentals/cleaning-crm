import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type FeatureFlag = {
  key: string;
  description: string | null;
  enabled: boolean;
  updated_at: string;
};

const PLAN_MRR: Record<string, number> = {
  starter: 79,
  professional: 199,
  enterprise: 499,
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function asCount(count: number | null | undefined) {
  return typeof count === "number" ? count : 0;
}

export default async function SuperAdminPortalPage() {
  const access = await requireSuperAdminAccess();

  if (access.needsAuth) {
    redirect("/super-admin/login");
  }

  if (access.rpcError) {
    if (process.env.NODE_ENV !== "production") {
      return (
        <main className="min-h-screen bg-slate-950 text-white">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-semibold tracking-tight">Super Admin access error</h1>
            <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
              {JSON.stringify(
                {
                  projectHostname: access.supabaseProjectHostname,
                  authUserId: access.user?.id ?? null,
                  authUserEmail: access.user?.email ?? null,
                  rpcResult: access.rpcResult,
                  rpcError: access.rpcError,
                  matchingSuperAdminRow: access.matchingSuperAdminRow,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight">Super Admin unavailable</h1>
          <p className="mt-3 text-sm text-slate-400">The platform could not verify Super Admin access. Check server logs.</p>
        </div>
      </main>
    );
  }

  if (access.denied) {
    redirect("/super-admin/login?reason=Access+denied");
  }

  const supabase = await createServerSupabaseClient();
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [
    totalUsersResult,
    totalCustomersResult,
    totalLeadsResult,
    totalCompaniesResult,
    activeSubscriptionsResult,
    demoRequestsResult,
    foundingPartnersResult,
    mrrSourceResult,
    trafficOverviewResult,
    featureFlagsResult,
  ] = await Promise.all([
    supabase.rpc("super_admin_total_users"),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("sales_leads").select("id", { count: "exact", head: true }),
    supabase.from("tenants").select("id", { count: "exact", head: true }),
    supabase
      .from("tenants")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .not("stripe_subscription_id", "is", null),
    supabase.from("demo_requests").select("id", { count: "exact", head: true }),
    supabase
      .from("sales_leads")
      .select("id", { count: "exact", head: true })
      .eq("source", "founding_partner"),
    supabase
      .from("tenants")
      .select("plan,status,stripe_subscription_id")
      .eq("status", "active")
      .not("stripe_subscription_id", "is", null),
    supabase
      .from("website_traffic_daily")
      .select("page_views,unique_visitors,sessions")
      .gte("metric_date", thirtyDaysAgo.toISOString().slice(0, 10)),
    supabase
      .from("feature_flags")
      .select("key,description,enabled,updated_at")
      .order("key", { ascending: true }),
  ]);

  const trafficRows = trafficOverviewResult.error ? [] : (trafficOverviewResult.data ?? []);
  const trafficTotals = trafficRows.reduce(
    (acc, row) => {
      acc.pageViews += row.page_views ?? 0;
      acc.uniqueVisitors += row.unique_visitors ?? 0;
      acc.sessions += row.sessions ?? 0;
      return acc;
    },
    { pageViews: 0, uniqueVisitors: 0, sessions: 0 },
  );

  const tenantsForMrr = mrrSourceResult.error ? [] : (mrrSourceResult.data ?? []);
  const monthlyRecurringRevenue = tenantsForMrr.reduce((sum, tenant) => {
    const rate = PLAN_MRR[tenant.plan] ?? 0;
    return sum + rate;
  }, 0);

  const metrics = [
    { label: "Total users", value: String(totalUsersResult.data ?? 0) },
    { label: "Total customers", value: String(asCount(totalCustomersResult.count)) },
    { label: "Total leads", value: String(asCount(totalLeadsResult.count)) },
    { label: "Total companies", value: String(asCount(totalCompaniesResult.count)) },
    { label: "Active subscriptions", value: String(asCount(activeSubscriptionsResult.count)) },
    { label: "Monthly recurring revenue", value: formatCurrency(monthlyRecurringRevenue) },
    { label: "Demo requests", value: String(asCount(demoRequestsResult.count)) },
    { label: "Founding Partner applications", value: String(asCount(foundingPartnersResult.count)) },
  ];

  const analyticsConnected = !trafficOverviewResult.error;
  const featureFlags = featureFlagsResult.error ? [] : ((featureFlagsResult.data ?? []) as FeatureFlag[]);

  const systemHealthItems = [
    {
      name: "Auth check",
      status: access.user ? "healthy" : "failing",
      detail: access.user ? "Super Admin session verified" : "Missing Super Admin session",
    },
    {
      name: "Database",
      status:
        totalCustomersResult.error || totalCompaniesResult.error || totalLeadsResult.error
          ? "degraded"
          : "healthy",
      detail:
        totalCustomersResult.error || totalCompaniesResult.error || totalLeadsResult.error
          ? "One or more metric queries failed"
          : "Platform metrics queries are healthy",
    },
    {
      name: "Analytics",
      status: analyticsConnected ? "healthy" : "pending",
      detail: analyticsConnected
        ? "Website traffic table is available and queryable"
        : "Analytics data source is not connected yet",
    },
    {
      name: "Feature flags",
      status: featureFlagsResult.error ? "degraded" : "healthy",
      detail: featureFlagsResult.error
        ? "Feature flags table not available"
        : `${featureFlags.length} flags loaded`,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">ServiceOS platform</p>
            <h1 className="text-3xl font-semibold tracking-tight">Super Admin Portal</h1>
            <p className="mt-1 text-sm text-slate-400">Authenticated as {access.user?.email ?? "-"}</p>
            <p className="mt-1 text-xs text-slate-500">Project: {access.supabaseProjectHostname}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/super-admin/dashboard"
              className="rounded-xl border border-slate-700 px-3 py-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Tenant Manager
            </Link>
            <Link
              href="/super-admin/login"
              className="rounded-xl border border-slate-700 px-3 py-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Switch account
            </Link>
          </div>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-cyan-300">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="mb-8 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Website traffic overview</h2>
            {analyticsConnected ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">30d Page views</p>
                  <p className="mt-2 text-2xl font-semibold text-cyan-300">{trafficTotals.pageViews}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">30d Unique visitors</p>
                  <p className="mt-2 text-2xl font-semibold text-cyan-300">{trafficTotals.uniqueVisitors}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">30d Sessions</p>
                  <p className="mt-2 text-2xl font-semibold text-cyan-300">{trafficTotals.sessions}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-amber-900/50 bg-amber-950/40 p-4 text-sm text-amber-200">
                Analytics is not connected yet. Populate website_traffic_daily to enable this overview.
              </p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">System health</h2>
            <div className="mt-4 space-y-3">
              {systemHealthItems.map((item) => (
                <div key={item.name} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-200">{item.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === "healthy"
                          ? "bg-emerald-950 text-emerald-300"
                          : item.status === "degraded"
                            ? "bg-amber-950 text-amber-300"
                            : item.status === "pending"
                              ? "bg-slate-800 text-slate-300"
                              : "bg-red-950 text-red-300"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Feature flags</h2>
          {featureFlags.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No feature flags configured.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="pb-3 pr-4 font-medium">Flag</th>
                    <th className="pb-3 pr-4 font-medium">Description</th>
                    <th className="pb-3 pr-4 font-medium">State</th>
                    <th className="pb-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {featureFlags.map((flag) => (
                    <tr key={flag.key}>
                      <td className="py-3 pr-4 font-medium text-slate-100">{flag.key}</td>
                      <td className="py-3 pr-4 text-slate-400">{flag.description ?? "-"}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            flag.enabled ? "bg-emerald-950 text-emerald-300" : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {flag.enabled ? "enabled" : "disabled"}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{new Date(flag.updated_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
