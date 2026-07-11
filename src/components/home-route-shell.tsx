"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboardHome } from "@/components/admin-dashboard-home";
import { PublicHomepage } from "@/components/public-homepage";

type HomeMode = "loading" | "public" | "admin";

export function HomeRouteShell() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [mode, setMode] = useState<HomeMode>("loading");

  useEffect(() => {
    const resolveHomeMode = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        setMode("public");
        return;
      }

      const { data: admin } = await supabase
        .from("tenant_admins")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (admin) {
        setMode("admin");
        return;
      }

      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (customer) {
        router.replace("/customer-portal");
        return;
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (employee) {
        router.replace("/employee-portal");
        return;
      }

      setMode("public");
    };

    void resolveHomeMode();
  }, [router, supabase]);

  if (mode === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-600">Loading ServiceOS…</p>
        </div>
      </div>
    );
  }

  if (mode === "admin") {
    return <AdminDashboardHome />;
  }

  return <PublicHomepage />;
}
