import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SuperAdminShell } from "@/components/super-admin-shell";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProtectedSuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireSuperAdminAccess();

  if (access.needsAuth) {
    redirect("/super-admin/login");
  }

  if (access.rpcError) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Super Admin unavailable
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            The platform could not verify Super Admin access. Check server logs.
          </p>
        </div>
      </main>
    );
  }

  if (access.denied) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Access denied
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Your authenticated account does not have Super Admin access.
          </p>
        </div>
      </main>
    );
  }

  return <SuperAdminShell>{children}</SuperAdminShell>;
}
