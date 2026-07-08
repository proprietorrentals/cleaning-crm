"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!data?.session?.user) {
          router.push("/super-admin/login");
          return;
        }

        const { data: superAdmin } = await supabase
          .from("super_admins")
          .select("id")
          .eq("auth_user_id", data.session.user.id)
          .maybeSingle();

        if (!superAdmin) {
          await supabase.auth.signOut();
          router.push("/super-admin/login?reason=Access+denied");
          return;
        }

        setUser(data.session.user);
      } catch (error) {
        console.error("Super admin auth check error:", error);
        router.push("/super-admin/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        router.push("/super-admin/login");
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500 mx-auto mb-4" />
          <p className="text-sm text-slate-400">Verifying super admin access…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
