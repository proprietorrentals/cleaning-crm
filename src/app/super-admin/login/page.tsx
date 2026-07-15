"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ServiceOSLogo } from "@/components/serviceos-logo";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setError(signInError.message); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Authentication failed."); return; }

      const { data: isSuperAdmin, error: rpcError } = await supabase.rpc("is_super_admin");

      if (rpcError) {
        console.error("super-admin login RPC error:", {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
        });
        setError(
          process.env.NODE_ENV === "development"
            ? `${rpcError.message}${rpcError.code ? ` (${rpcError.code})` : ""}`
            : "Unable to verify Super Admin access.",
        );
        return;
      }

      if (isSuperAdmin !== true) {
        console.info("super-admin login no redirect", {
          currentPath: "/super-admin/login",
          redirectDestination: null,
          reason: "successful-login-but-rpc-false",
        });
        await supabase.auth.signOut();
        setError("Access denied. Super admin account required.");
        return;
      }

      console.info("super-admin login redirect", {
        currentPath: "/super-admin/login",
        redirectDestination: "/super-admin",
        reason: "successful-login-and-rpc-true",
      });
      router.replace("/super-admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <ServiceOSLogo variant="stacked" surface="dark" size="mobile" subtitle="Platform Console" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition"
              placeholder="admin@platform.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in to Platform"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          This portal is restricted to ServiceOS platform administrators.
        </p>
      </div>
    </div>
  );
}
