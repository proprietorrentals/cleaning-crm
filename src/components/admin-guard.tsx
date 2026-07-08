"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps admin-only pages.
 *
 * Access logic:
 *   tenant_admin record exists  → allow (admin for their tenant)
 *   customer record exists      → redirect to /customer-portal
 *   employee record exists      → redirect to /employee-portal
 *   everything else             → redirect to /admin-login
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!data?.session?.user) {
          router.push("/admin-login");
          return;
        }

        const uid = data.session.user.id;

        // 1. Check tenant_admins first.
        const { data: admin } = await supabase
          .from("tenant_admins")
          .select("id")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (admin) {
          setUser(data.session.user);
          return;
        }

        // 2. Redirect customers to their portal.
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", uid)
          .maybeSingle();

        if (customer) {
          router.replace("/customer-portal");
          return;
        }

        // 3. Redirect employees to their portal.
        const { data: employee } = await supabase
          .from("employees")
          .select("id")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (employee) {
          router.replace("/employee-portal");
          return;
        }

        // 4. Unknown user → back to login.
        router.push("/admin-login");
      } catch (error) {
        console.error("AdminGuard auth error:", error);
        router.push("/admin-login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) router.push("/admin-login");
    });

    return () => listener?.subscription.unsubscribe();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
