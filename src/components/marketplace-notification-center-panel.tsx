"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type NotificationRow = {
  notification_id: string;
  saved_search_id: string;
  lead_id: string;
  lead_business_name: string;
  lead_city: string;
  lead_state: string;
  lead_property_type: string;
  lead_grade: string;
  estimated_monthly_value: number;
  estimated_annual_value: number;
  close_probability: number;
  match_summary: string;
  matched_criteria: Record<string, unknown>;
  notification_email: boolean;
  notification_in_app: boolean;
  notification_sms: boolean;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

type SavedSearchRow = {
  saved_search_id: string;
  name: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function methodLabels(notification: NotificationRow) {
  return [
    notification.notification_email ? "Email" : null,
    notification.notification_in_app ? "In-app" : null,
    notification.notification_sms ? "SMS (placeholder)" : null,
  ].filter(Boolean) as string[];
}

export function MarketplaceNotificationCenterPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [savedSearchNames, setSavedSearchNames] = useState<
    Record<string, string>
  >({});

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [notificationsResult, searchesResult] = await Promise.all([
      supabase
        .from("marketplace_notifications")
        .select(
          "notification_id,saved_search_id,lead_id,lead_business_name,lead_city,lead_state,lead_property_type,lead_grade,estimated_monthly_value,estimated_annual_value,close_probability,match_summary,matched_criteria,notification_email,notification_in_app,notification_sms,is_read,read_at,created_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("marketplace_saved_searches")
        .select("saved_search_id,name")
        .order("created_at", { ascending: false }),
    ]);

    if (notificationsResult.error) {
      setError(notificationsResult.error.message);
      setLoading(false);
      return;
    }

    if (searchesResult.error) {
      setError(searchesResult.error.message);
      setLoading(false);
      return;
    }

    setNotifications((notificationsResult.data ?? []) as NotificationRow[]);
    setSavedSearchNames(
      ((searchesResult.data ?? []) as SavedSearchRow[]).reduce<
        Record<string, string>
      >((acc, row) => {
        acc[row.saved_search_id] = row.name;
        return acc;
      }, {}),
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markRead = async (notificationId: string) => {
    const { error: updateError } = await supabase
      .from("marketplace_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("notification_id", notificationId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Notification marked as read.");
    await loadNotifications();
  };

  const markAllRead = async () => {
    const unreadIds = notifications
      .filter((notification) => !notification.is_read)
      .map((notification) => notification.notification_id);

    if (unreadIds.length === 0) {
      setSuccess("No unread notifications.");
      return;
    }

    const { error: updateError } = await supabase
      .from("marketplace_notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("notification_id", unreadIds);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("All notifications marked as read.");
    await loadNotifications();
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700/80">
            Notification center
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Matching leads from saved searches
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Verified leads automatically generate notifications for every
            matching saved search in the current tenant.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl bg-cyan-50 px-4 py-3 text-right">
            <p className="text-xs text-cyan-700">Unread</p>
            <p className="text-2xl font-semibold text-cyan-950">
              {unreadCount}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
          >
            Mark all read
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            No notifications yet. Once a lead is verified, matching saved
            searches will appear here.
          </div>
        ) : (
          notifications.map((notification) => (
            <article
              key={notification.notification_id}
              className={`rounded-[1.5rem] border p-4 transition ${notification.is_read ? "border-slate-200 bg-slate-50" : "border-cyan-200 bg-cyan-50/60 shadow-sm"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {notification.lead_business_name}
                    </h3>
                    {notification.is_read ? (
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        Read
                      </span>
                    ) : (
                      <span className="rounded-full bg-cyan-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {notification.lead_city}, {notification.lead_state} • Grade{" "}
                    {notification.lead_grade} •{" "}
                    {formatCurrency(notification.estimated_monthly_value)}{" "}
                    monthly
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    Saved search:{" "}
                    {savedSearchNames[notification.saved_search_id] ??
                      "Deleted search"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void markRead(notification.notification_id)}
                  disabled={notification.is_read}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-cyan-200 hover:text-cyan-700 disabled:opacity-50"
                >
                  {notification.is_read ? "Read" : "Mark read"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                <span className="rounded-full bg-white px-3 py-1">
                  {notification.lead_property_type}
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  {Math.round(notification.close_probability * 100)}% close
                  probability
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  Annual {formatCurrency(notification.estimated_annual_value)}
                </span>
                {methodLabels(notification).map((label) => (
                  <span key={label} className="rounded-full bg-white px-3 py-1">
                    {label}
                  </span>
                ))}
              </div>

              <p className="mt-3 text-sm text-slate-600">
                {notification.match_summary || "Matched saved search criteria."}
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {Object.entries(notification.matched_criteria ?? {}).map(
                  ([key, value]) =>
                    value ? (
                      <span
                        key={key}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700"
                      >
                        {key}: {String(value)}
                      </span>
                    ) : null,
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-500">
                <p>Created {formatDate(notification.created_at)}</p>
                <p>
                  {notification.read_at
                    ? `Read ${formatDate(notification.read_at)}`
                    : "Unread"}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
