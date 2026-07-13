"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ServiceOSBrand } from "@/components/serviceos-brand";

type Announcement = {
  id: string;
  title: string;
  body: string;
  priority: "normal" | "important" | "urgent";
  audience_scope: "all" | "supervisors" | "night_shift" | "day_shift" | "route_teams";
  requires_ack: boolean;
  created_at: string;
};

type AnnouncementRead = {
  announcement_id: string;
  acknowledged_at: string | null;
};

type ContextState = {
  userId: string;
  tenantId: string;
  canCreate: boolean;
  roleLabel: string;
};

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Customers", href: "/customers" },
  { label: "Quotes", href: "/quotes" },
  { label: "Jobs", href: "/jobs" },
  { label: "Employees", href: "/employees" },
  { label: "Invoices", href: "/invoices" },
  { label: "Schedule", href: "/schedule" },
  { label: "Website Builder", href: "/website-builder" },
  { label: "Operations Center", href: "/operations-center", active: true },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

function priorityBadge(priority: Announcement["priority"]) {
  if (priority === "urgent") return "bg-rose-100 text-rose-700";
  if (priority === "important") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function audienceLabel(value: Announcement["audience_scope"]) {
  if (value === "night_shift") return "Night shift";
  if (value === "day_shift") return "Day shift";
  if (value === "route_teams") return "Route teams";
  if (value === "supervisors") return "Supervisors";
  return "All";
}

function isSupervisorRole(role: string | null | undefined) {
  const normalized = (role ?? "").toLowerCase();
  return normalized === "supervisor" || normalized === "manager";
}

export default function OperationsCenterAdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [context, setContext] = useState<ContextState | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readStats, setReadStats] = useState<Record<string, { read: number; acknowledged: number }>>({});

  const [form, setForm] = useState({
    title: "",
    body: "",
    priority: "normal" as Announcement["priority"],
    audience_scope: "all" as Announcement["audience_scope"],
    requires_ack: false,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setError(sessionError.message);
      setLoading(false);
      return;
    }

    const userId = session?.user?.id;
    if (!userId) {
      router.replace("/admin-login");
      return;
    }

    const [{ data: adminRow, error: adminError }, { data: employeeRow, error: employeeError }] = await Promise.all([
      supabase
        .from("tenant_admins")
        .select("tenant_id")
        .eq("auth_user_id", userId)
        .maybeSingle(),
      supabase
        .from("employees")
        .select("tenant_id,role,is_active")
        .eq("auth_user_id", userId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (adminError) {
      setError(adminError.message);
      setLoading(false);
      return;
    }

    if (employeeError) {
      setError(employeeError.message);
      setLoading(false);
      return;
    }

    const tenantId = adminRow?.tenant_id ?? employeeRow?.tenant_id ?? null;
    if (!tenantId) {
      setError("You do not have tenant access for Operations Center.");
      setLoading(false);
      return;
    }

    const canCreate = Boolean(adminRow) || isSupervisorRole(employeeRow?.role);
    const roleLabel = adminRow ? "Tenant Admin" : employeeRow?.role ?? "Employee";

    setContext({ userId, tenantId, canCreate, roleLabel });

    const { data: announcementsData, error: announcementsError } = await supabase
      .from("announcements")
      .select("id,title,body,priority,audience_scope,requires_ack,created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (announcementsError) {
      setError(announcementsError.message);
      setLoading(false);
      return;
    }

    const announcementRows = (announcementsData ?? []) as Announcement[];
    setAnnouncements(announcementRows);

    if (announcementRows.length > 0) {
      const announcementIds = announcementRows.map((item) => item.id);
      const { data: readRows, error: readsError } = await supabase
        .from("announcement_reads")
        .select("announcement_id,acknowledged_at")
        .eq("tenant_id", tenantId)
        .in("announcement_id", announcementIds);

      if (readsError) {
        setError(readsError.message);
        setLoading(false);
        return;
      }

      const stats = (readRows ?? []).reduce<Record<string, { read: number; acknowledged: number }>>((acc, row) => {
        if (!acc[row.announcement_id]) {
          acc[row.announcement_id] = { read: 0, acknowledged: 0 };
        }
        acc[row.announcement_id].read += 1;
        if (row.acknowledged_at) {
          acc[row.announcement_id].acknowledged += 1;
        }
        return acc;
      }, {});

      setReadStats(stats);
    } else {
      setReadStats({});
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateAnnouncement = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!context) return;
    if (!context.canCreate) {
      setError("You do not have permission to create announcements.");
      return;
    }

    if (!form.title.trim() || !form.body.trim()) {
      setError("Title and message are required.");
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from("announcements").insert({
      tenant_id: context.tenantId,
      created_by: context.userId,
      title: form.title.trim(),
      body: form.body.trim(),
      priority: form.priority,
      audience_scope: form.audience_scope,
      requires_ack: form.priority === "urgent" ? true : form.requires_ack,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setForm({
      title: "",
      body: "",
      priority: "normal",
      audience_scope: "all",
      requires_ack: false,
    });

    setSuccess("Announcement created.");
    await loadData();
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white/90 px-5 py-6 lg:w-64 lg:border-b-0 lg:border-r">
          <ServiceOSBrand subtitle="Operations Hub" />
          <nav className="mt-8 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  item.active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <p className="text-sm font-medium text-blue-600">Admin Portal</p>
            <h1 className="text-2xl font-semibold text-slate-900">Operations Center</h1>
            <p className="mt-1 text-sm text-slate-500">Create and monitor tenant announcements with read and acknowledgement tracking.</p>
            {context ? <p className="mt-2 text-xs text-slate-500">Signed in as: {context.roleLabel}</p> : null}
          </header>

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          {success ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
          ) : null}

          {loading ? (
            <p className="text-sm text-slate-500">Loading Operations Center...</p>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Create Announcement</h2>
                {!context?.canCreate ? (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    You have read-only access. Only admins and supervisors can create announcements.
                  </p>
                ) : null}

                <form className="mt-4 space-y-4" onSubmit={handleCreateAnnouncement}>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                      placeholder="Title"
                      disabled={!context?.canCreate || submitting}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Message</label>
                    <textarea
                      value={form.body}
                      onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                      className="min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                      placeholder="Message body"
                      disabled={!context?.canCreate || submitting}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Priority</label>
                      <select
                        value={form.priority}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            priority: event.target.value as Announcement["priority"],
                            requires_ack: event.target.value === "urgent" ? true : current.requires_ack,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                        disabled={!context?.canCreate || submitting}
                      >
                        <option value="normal">Normal</option>
                        <option value="important">Important</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Audience</label>
                      <select
                        value={form.audience_scope}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            audience_scope: event.target.value as Announcement["audience_scope"],
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                        disabled={!context?.canCreate || submitting}
                      >
                        <option value="all">All</option>
                        <option value="supervisors">Supervisors</option>
                        <option value="night_shift">Night Shift</option>
                        <option value="day_shift">Day Shift</option>
                        <option value="route_teams">Route Teams</option>
                      </select>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.priority === "urgent" ? true : form.requires_ack}
                      disabled={!context?.canCreate || form.priority === "urgent" || submitting}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          requires_ack: event.target.checked,
                        }))
                      }
                    />
                    Require acknowledgement
                  </label>

                  <button
                    type="submit"
                    disabled={!context?.canCreate || submitting}
                    className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                  >
                    {submitting ? "Saving..." : "Create Announcement"}
                  </button>
                </form>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Existing Announcements</h2>
                <p className="mt-1 text-sm text-slate-500">Read and acknowledgement metrics by announcement.</p>

                <div className="mt-4 space-y-3">
                  {announcements.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No announcements yet.</p>
                  ) : (
                    announcements.map((announcement) => {
                      const stats = readStats[announcement.id] ?? { read: 0, acknowledged: 0 };

                      return (
                        <article key={announcement.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{announcement.title}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge(announcement.priority)}`}>
                              {announcement.priority}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {audienceLabel(announcement.audience_scope)}
                            </span>
                            {announcement.requires_ack ? (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Ack required</span>
                            ) : null}
                          </div>

                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{announcement.body}</p>

                          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                            <p>Created: {new Date(announcement.created_at).toLocaleString()}</p>
                            <p>Read: {stats.read}</p>
                            <p>Acknowledged: {stats.acknowledged}</p>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
