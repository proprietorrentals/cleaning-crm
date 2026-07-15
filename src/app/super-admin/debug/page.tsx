import { redirect } from "next/navigation";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

function maskUserId(userId: string | null | undefined) {
  if (!userId) return "-";
  if (userId.length <= 12) return userId;
  return `${userId.slice(0, 8)}…${userId.slice(-4)}`;
}

export default async function SuperAdminDebugPage() {
  const access = await requireSuperAdminAccess();

  if (access.needsAuth) {
    redirect("/super-admin/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Super Admin Debug</h1>
        <p className="mt-2 text-sm text-slate-400">Temporary authenticated-only diagnostic route.</p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            { label: "Masked user ID", value: maskUserId(access.user?.id) },
            { label: "Email", value: access.user?.email ?? "-" },
            { label: "Project hostname", value: access.supabaseProjectHostname },
            { label: "RPC result", value: access.rpcError ? "error" : String(access.rpcResult ?? false) },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-2 break-all text-sm text-slate-100">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">RPC error</p>
            <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">
              {access.rpcError ? JSON.stringify(access.rpcError, null, 2) : "none"}
            </pre>
          </article>
        </section>
      </div>
    </main>
  );
}
