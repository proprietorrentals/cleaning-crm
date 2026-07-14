"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { ServiceOSLogo } from "@/components/serviceos-logo";
import { createClient } from "@/lib/supabase/client";

export default function EmployeeLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <EmployeeLoginContent />
    </Suspense>
  );
}

function EmployeeLoginContent() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    searchParams.get("reason"),
  );

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return;
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("id,is_active")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (employee?.is_active) {
        router.replace("/employee-portal");
      }
    };

    checkSession();
  }, [router, supabase]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Login failed: ${error.message}`);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Unable to verify your account. Please try again.");
      setLoading(false);
      return;
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id,is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (employeeError || !employee?.is_active) {
      await supabase.auth.signOut();
      setMessage(
        "This account is not an active employee profile. Contact an administrator.",
      );
      setLoading(false);
      return;
    }

    router.replace("/employee-portal");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
        <div className="mb-7 text-center">
          <div className="mx-auto flex justify-center">
            <ServiceOSLogo variant="stacked" size="mobile" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">
            Employee Portal
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to view your assigned jobs and schedule.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="employeeEmail"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Work email
            </label>
            <input
              id="employeeEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              placeholder="name@serviceos.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="employeePassword"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="employeePassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {message}
          </p>
        ) : null}

        <p className="mt-5 text-center text-xs text-slate-500">
          Need account access? Ask an administrator to link your employee record
          to your auth user.
        </p>
        <p className="mt-3 text-center text-sm text-slate-600">
          <Link
            href="/demo"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Explore Interactive Demo
          </Link>
        </p>
        <p className="mt-3 text-center text-sm text-slate-500">
          Admin sign-in:{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Main CRM login
          </Link>
        </p>
      </div>
    </div>
  );
}
