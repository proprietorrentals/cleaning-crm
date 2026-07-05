"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AdminGuardProps {
  children: React.ReactNode;
}

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
          // Not authenticated, redirect to admin login
          router.push("/admin-login");
        } else {
          // Check if user is an admin (not linked to a customer)
          const { data: customer } = await supabase
            .from("customers")
            .select("id")
            .eq("user_id", data.session.user.id)
            .single();

          if (customer) {
            // User is a customer, not an admin
            console.warn("Customer trying to access admin panel");
            router.push("/customer-portal");
          } else {
            // User is an admin, allow access
            setUser(data.session.user);
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/admin-login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        router.push("/admin-login");
      } else {
        setUser(session.user);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
