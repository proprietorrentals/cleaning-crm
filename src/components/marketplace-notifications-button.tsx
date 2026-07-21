"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function MarketplaceNotificationsButton() {
  const supabase = useMemo(() => createClient(), []);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadUnreadCount = async () => {
      const { count } = await supabase
        .from("marketplace_notifications")
        .select("notification_id", { count: "exact", head: true })
        .eq("is_read", false);

      if (isMounted) {
        setUnreadCount(count ?? 0);
      }
    };

    void loadUnreadCount();

    const refresh = () => {
      void loadUnreadCount();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [supabase]);

  return (
    <Link
      href="/marketplace/notifications"
      className="relative inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700"
      aria-label={`Marketplace notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
    >
      <span className="text-lg">🔔</span>
      <span className="ml-2 hidden text-sm font-medium sm:inline">Alerts</span>
      <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-cyan-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {unreadCount}
      </span>
    </Link>
  );
}
