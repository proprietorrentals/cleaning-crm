import { SuperAdminAnalyticsDashboard } from "@/components/super-admin-analytics-dashboard";
import { isPlatformEventName, type PlatformEventName } from "@/lib/platform-events";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PlatformEventRow = {
  id: string;
  event_name: PlatformEventName;
  event_source: string;
  page_path: string | null;
  created_at: string;
};

export default async function SuperAdminPortalPage() {
  const access = await requireSuperAdminAccess();

  if (access.rpcError) {
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
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight">Access denied</h1>
          <p className="mt-3 text-sm text-slate-400">Your authenticated account does not have Super Admin access.</p>
        </div>
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const thirtyDaysAgoIso = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsersResult,
    companiesResult,
    demoRequestsResult,
    foundingPartnerResult,
    platformEventsResult,
  ] = await Promise.all([
    supabase.rpc("super_admin_total_users"),
    supabase.from("tenants").select("id", { count: "exact", head: true }),
    supabase
      .from("sales_leads")
      .select("id", { count: "exact", head: true })
      .eq("source", "demo_request"),
    supabase
      .from("sales_leads")
      .select("id", { count: "exact", head: true })
      .or("founding_partner_interest.eq.true,source.eq.founding_partner"),
    supabase
      .from("platform_events")
      .select("id,event_name,event_source,page_path,created_at")
      .gte("created_at", thirtyDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(3000),
  ]);

  const events: PlatformEventRow[] = (platformEventsResult.data ?? [])
    .filter((event) => isPlatformEventName(event.event_name))
    .map((event) => ({
      id: event.id,
      event_name: event.event_name,
      event_source: event.event_source,
      page_path: event.page_path,
      created_at: event.created_at,
    }));

  const vercelDashboardUrl =
    process.env.VERCEL_ANALYTICS_DASHBOARD_URL || process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_DASHBOARD_URL || "https://vercel.com/dashboard";

  return (
    <SuperAdminAnalyticsDashboard
      userEmail={access.user?.email}
      projectHostname={access.supabaseProjectHostname}
      companiesCount={companiesResult.count ?? 0}
      usersCount={typeof totalUsersResult.data === "number" ? totalUsersResult.data : null}
      demoRequestsCount={demoRequestsResult.count ?? 0}
      foundingPartnerCount={foundingPartnerResult.count ?? 0}
      userCountUnavailable={Boolean(totalUsersResult.error)}
      vercelDashboardUrl={vercelDashboardUrl}
      events={events}
    />
  );
}
