"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        // Sign up new admin
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: "admin",
            },
          },
        });

        if (error) {
          setMessage(`❌ Sign up failed: ${error.message}`);
        } else {
          setMessage("✓ Check your email to confirm your account");
          setEmail("");
          setPassword("");
        }
      } else {
        // Log in existing admin
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(`❌ Login failed: ${error.message}`);
        } else {
          setMessage("✓ Login successful, redirecting...");
          setTimeout(() => {
            router.push("/");
          }, 1000);
        }
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
            <h1 className="text-3xl font-bold text-slate-900">Cleaning CRM</h1>
            <p className="text-slate-600 mt-2">Admin Portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="mt-6 rounded-lg bg-blue-50 p-4 text-xs text-slate-700">
            <p className="font-semibold mb-1">Admin Portal</p>
            <p>This is the admin login for the CRM owner. For customer access, visit the <a href="/customer-auth" className="text-blue-600 hover:underline">customer portal</a>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
