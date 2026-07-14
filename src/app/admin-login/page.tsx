"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        // Already logged in, redirect to admin dashboard
        router.push("/");
      }
    };
    checkAuth();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // Sign up: call the new admin-signup API route.
        if (!companyName.trim()) {
          setMessage("❌ Company name is required.");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/auth/admin-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, companyName }),
        });

        if (!res.ok) {
          const { error } = await res.json();
          setMessage(`❌ Signup failed: ${error}`);
          setLoading(false);
          return;
        }

        setMessage("✓ Account created! Signing you in...");

        // Now sign in.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setMessage(`❌ Login failed: ${signInError.message}`);
          setLoading(false);
          return;
        }

        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        // Log in existing admin.
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(`❌ Login failed: ${error.message}`);
          setLoading(false);
          return;
        }

        setMessage("✓ Login successful, redirecting...");
        setTimeout(() => {
          router.push("/");
        }, 1000);
      }
    } catch (error) {
      setMessage(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl overflow-visible rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-300/40">
        <aside className="hidden w-full max-w-[380px] flex-col justify-center border-r border-slate-200 bg-slate-50/70 px-10 py-12 md:flex">
          <div className="flex flex-col items-center justify-center gap-3">
            <Image
              src="/icon.svg"
              alt="ServiceOS"
              width={165}
              height={110}
              className="h-auto w-full max-w-[165px] object-contain"
              priority
            />
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              ServiceOS
            </span>
            <p className="text-center text-sm text-slate-500 dark:text-slate-300">
              Operations Dashboard
            </p>
          </div>
        </aside>

        <div className="w-full p-6 sm:p-8 md:p-10">
          {/* Header */}
          <div className="mb-8 text-center md:hidden">
            <div className="flex flex-col items-center justify-center gap-3">
              <Image
                src="/icon.svg"
                alt="ServiceOS"
                width={150}
                height={100}
                className="h-auto w-full max-w-[150px] object-contain"
                priority
              />
              <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                ServiceOS
              </span>
              <p className="text-center text-xs text-slate-500 dark:text-slate-300">
                Operations Dashboard
              </p>
            </div>
            <p className="mt-2 text-slate-600">Admin Portal</p>
          </div>

          <div className="mb-8 hidden text-center md:block">
            <h1 className="text-2xl font-semibold text-slate-900">
              Admin Portal
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in to manage customers, jobs, team operations, and billing.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Name (signup only) */}
            {isSignUp && (
              <div>
                <label
                  htmlFor="companyName"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Your Company Inc."
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="adminEmail"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email Address
              </label>
              <input
                id="adminEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="admin@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="adminPassword"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="adminPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="••••••••"
              />
            </div>

            {/* Message */}
            {message && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  message.includes("❌")
                    ? "bg-red-50 text-red-800"
                    : "bg-green-50 text-green-800"
                }`}
              >
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium py-2.5 rounded-lg transition mt-6"
            >
              {loading
                ? "Loading..."
                : isSignUp
                  ? "Create Admin Account"
                  : "Login as Admin"}
            </button>
          </form>

          {/* Secondary Actions */}
          <div className="mt-6 text-center">
            {isSignUp ? (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setMessage(null);
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Already have an account? Login
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs tracking-[0.2em] text-slate-400">
                  ──────────────
                </p>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  🎥 Explore Interactive Demo
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setMessage(null);
                  }}
                  className="block w-full text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Need an account? Create one
                </button>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-8 space-y-4">
            {/* Employee Portal Card */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="mb-2 font-semibold text-emerald-900">
                Employee Portal
              </h3>
              <p className="mb-3 text-sm text-emerald-800">
                Employees can log in to view assigned jobs, clock in/out, upload
                photos, and complete work.
              </p>
              <Link
                href="/employee-login"
                className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Visit the employee portal
                <span>→</span>
              </Link>
            </div>

            {/* Customer Portal Card */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="mb-2 font-semibold text-amber-900">
                Customer Portal
              </h3>
              <p className="mb-3 text-sm text-amber-800">
                Customers can track their jobs, quotes, invoices, and request
                services.
              </p>
              <Link
                href="/customer-auth"
                className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline"
              >
                Visit the customer portal
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
