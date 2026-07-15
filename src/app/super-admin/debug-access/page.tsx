import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function hostnameFromUrl(url: string | undefined) {
  if (!url) return "not configured";

  try {
    return new URL(url).hostname;
  } catch {
    return "invalid URL";
  }
}

export default async function SuperAdminDebugAccessPage() {
  const supabase = await createServerSupabaseClient();
  const projectHostname = hostnameFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/super-admin/login");
  }

  const [rpcCheck, diagnosticCheck, directRowCheck] = await Promise.all([
    supabase.rpc("is_super_admin"),
    supabase.rpc("super_admin_access_diagnostic"),
    supabase
      .from("super_admins")
      .select("id,email,auth_user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle(),
  ]);

  const diagnosticRow = diagnosticCheck.data?.[0] ?? null;

  if (process.env.NODE_ENV !== "production") {
    console.info("super-admin debug access", {
      projectHostname,
      authUserId: user.id,
      authUserEmail: user.email,
      rpcResult: rpcCheck.data ?? null,
      rpcError: rpcCheck.error
        ? { code: rpcCheck.error.code, message: rpcCheck.error.message }
        : null,
      diagnosticRow,
      directRowCheck,
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Super Admin Access Diagnostics</h1>
        <p className="mt-2 text-sm text-slate-400">Temporary diagnostic page for the logged-in user only.</p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            { label: "Project hostname", value: projectHostname },
            { label: "Session user ID", value: user.id },
            { label: "Session email", value: user.email ?? "-" },
            { label: "RPC is_super_admin()", value: rpcCheck.error ? "error" : String(rpcCheck.data ?? false) },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-2 break-all text-sm text-slate-100">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">RPC error</p>
            <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">
              {rpcCheck.error
                ? JSON.stringify(
                    { code: rpcCheck.error.code, message: rpcCheck.error.message, details: rpcCheck.error.details },
                    null,
                    2,
                  )
                : "none"}
            </pre>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Matching super_admins row</p>
            <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">
              {directRowCheck.error
                ? JSON.stringify(
                    { code: directRowCheck.error.code, message: directRowCheck.error.message },
                    null,
                    2,
                  )
                : JSON.stringify(directRowCheck.data, null, 2)}
            </pre>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Diagnostic RPC row</p>
          <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">
            {diagnosticCheck.error
              ? JSON.stringify(
                  { code: diagnosticCheck.error.code, message: diagnosticCheck.error.message },
                  null,
                  2,
                )
              : JSON.stringify(diagnosticRow, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
