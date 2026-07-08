"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkExisting = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return;
      const { data: sa } = await supabase
        .from("super_admins")
        .select("id")
        .eq("auth_user_id", data.session.user.id)
        .maybeSingle();
      if (sa) router.replace("/super-admin/dashboard");
    };
    checkExisting();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setError(signInError.message); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Authentication failed."); return; }

      const { data: sa } = await supabase
        .from("super_admins")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!sa) {
        await supabase.auth.signOut();
        setError("Access denied. Super admin account required.");
        return;
      }

      router.replace("/super-admin/dashboard");
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
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-2xl mb-4">
            ⚡
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin</h1>
          <p className="mt-1 text-sm text-slate-400">ServiceFlow Platform Console</p>
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
          This portal is restricted to ServiceFlow platform administrators.
        </p>
      </div>
    </div>
  );
}
