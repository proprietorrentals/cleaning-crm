"use client";

import { createClient } from "@/lib/supabase/client";
import { ServiceOSBrand } from "@/components/serviceos-brand";
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
  const [companyCode, setCompanyCode] = useState("");
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
          console.error("Error status:", error.status);
          console.error("Error code:", error.code);
          
          let errorMsg = error.message;
          if (error.message.includes("invalid")) {
            errorMsg += " - Email or password may be incorrect";
          }
          
          setMessage(`❌ Login failed: ${errorMsg}`);
          setLoading(false);
          return;
        }

        setMessage("✓ Login successful! Redirecting...");
        setTimeout(() => router.push("/customer-portal"), 1000);
      } else {
        // Signup mode: customer must have a valid company code (tenant slug).
        if (!companyCode.trim()) {
          setMessage("❌ Company code is required.");
          setLoading(false);
          return;
        }

        if (!email || !password || !contactName) {
          setMessage("❌ Email, password, and contact name are required.");
          setLoading(false);
          return;
        }

        // 1. Look up the tenant by slug.
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("id")
          .eq("slug", companyCode.toLowerCase().trim())
          .maybeSingle();

        if (tenantError || !tenant) {
          setMessage("❌ Invalid company code. Please check and try again.");
          setLoading(false);
          return;
        }

        // 2. Create auth user.
        const { data: authData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              company_code: companyCode,
              contact_name: contactName,
            },
          },
        });

        if (signupError) {
          setMessage(`❌ Signup failed: ${signupError.message}`);
          setLoading(false);
          return;
        }

        if (!authData.user) {
          setMessage("❌ Signup failed. Please try again.");
          setLoading(false);
          return;
        }

        // 3. Create customer record (tenant_id is auto-filled by trigger).
        const { error: insertError } = await supabase.from("customers").insert({
          user_id: authData.user.id,
          company_name: contactName, // Use contact name as fallback
          contact_name: contactName,
          email,
          phone,
        });

        if (insertError) {
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
            <ServiceOSBrand iconSize={32} textSize="sm" />
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
                      Company Code *
                    </label>
                    <input
                      type="text"
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                      placeholder="my-company"
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">Ask your administrator for your company code.</p>
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
                  setCompanyCode("");
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
