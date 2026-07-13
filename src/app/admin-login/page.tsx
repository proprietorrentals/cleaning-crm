"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ServiceOSLogo } from "@/components/serviceos-logo";

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
      setMessage(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <ServiceOSLogo variant="stacked" size="mobile" />
            </div>
            <p className="text-slate-600 mt-2">Admin Portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Name (signup only) */}
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Company Name
              </label>
              <input
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
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
              <div className={`rounded-lg p-3 text-sm ${
                message.includes("❌") 
                  ? "bg-red-50 text-red-800" 
                  : "bg-green-50 text-green-800"
              }`}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium py-2.5 rounded-lg transition mt-6"
            >
              {loading ? "Loading..." : isSignUp ? "Create Admin Account" : "Login as Admin"}
            </button>
          </form>

          {/* Toggle Sign Up / Login */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {isSignUp
                ? "Already have an account? Login"
                : "Need an account? Create one"}
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-8 space-y-4">
            {/* Employee Portal Card */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="font-semibold text-emerald-900 mb-2">Employee Portal</h3>
              <p className="text-sm text-emerald-800 mb-3">
                Employees can log in to view assigned jobs, clock in/out, upload photos, and complete work.
              </p>
              <a 
                href="/employee-login"
                className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Visit the employee portal
                <span>→</span>
              </a>
            </div>

            {/* Customer Portal Card */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-semibold text-amber-900 mb-2">Customer Portal</h3>
              <p className="text-sm text-amber-800 mb-3">
                Customers can track their jobs, quotes, invoices, and request services.
              </p>
              <a 
                href="/customer-auth"
                className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline"
              >
                Visit the customer portal
                <span>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
