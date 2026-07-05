"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type AuthMode = "login" | "signup";

export default function CustomerAuthPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/customer-portal");
      }
    };
    checkAuth();
  }, [supabase, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Login error:", error);
          setMessage(`❌ Login failed: ${error.message}`);
          setLoading(false);
          return;
        }

        setMessage("✓ Login successful! Redirecting...");
        setTimeout(() => router.push("/customer-portal"), 1000);
      } else {
        // Signup mode
        if (!companyName || !contactName) {
          setMessage("❌ Please fill in all required fields.");
          setLoading(false);
          return;
        }

        // Create auth user
        const { data: authData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              company_name: companyName,
              contact_name: contactName,
            },
          },
        });

        if (signupError) {
          console.error("Signup error:", signupError);
          setMessage(`❌ Signup failed: ${signupError.message}`);
          setLoading(false);
          return;
        }

        if (!authData.user) {
          setMessage("❌ Signup failed. Please try again.");
          setLoading(false);
          return;
        }

        // Create customer record
        const { error: insertError } = await supabase.from("customers").insert({
          user_id: authData.user.id,
          company_name: companyName,
          contact_name: contactName,
          email,
          phone,
        });

        if (insertError) {
          console.error("Customer creation error:", insertError);
          setMessage(`❌ Failed to create customer profile: ${insertError.message}`);
          setLoading(false);
          return;
        }

        setMessage("✓ Account created! Signing you in...");
        setTimeout(() => router.push("/customer-portal"), 1000);
      }
    } catch (error) {
      console.error("Auth error:", error);
      setMessage(`❌ An error occurred: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CR</span>
            </div>
            <span className="font-semibold text-slate-900">Cleaning CRM</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                {mode === "login" ? "Customer Login" : "Create Account"}
              </h1>
              <p className="text-sm text-slate-600">
                {mode === "login"
                  ? "Sign in to your customer portal"
                  : "Register for your customer portal"}
              </p>
            </div>

            {message && (
              <div
                className={`mb-6 rounded-xl px-4 py-3 text-sm ${
                  message.includes("❌")
                    ? "border border-red-200 bg-red-50 text-red-700"
                    : "border border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "signup" && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                      placeholder="Your Company Ltd"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Phone (optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setMessage(null);
                  setEmail("");
                  setPassword("");
                  setCompanyName("");
                  setContactName("");
                  setPhone("");
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium transition"
              >
                {mode === "login"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>

            <div className="mt-4">
              <Link
                href="/"
                className="block text-center text-xs text-slate-500 hover:text-slate-700 transition"
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
