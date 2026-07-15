"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ServiceOSLogo } from "@/components/serviceos-logo";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const website = (formData.get("website") as string | null)?.trim() ?? "";

    const parsedFullName = fullName.trim();
    if (!parsedFullName) {
      setMessage("Please enter your full name.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: parsedFullName,
          company_name: companyName.trim() || null,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/public-leads/free-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: parsedFullName,
          company: companyName.trim(),
          email: email.trim(),
          message: "Free trial signup submitted from /signup.",
          website,
        }),
      });

      if (!response.ok && process.env.NODE_ENV === "development") {
        const leadErr = await response.json();
        console.warn("free trial lead capture warning:", leadErr?.error ?? "unknown error");
      }
    } catch (leadError) {
      if (process.env.NODE_ENV === "development") {
        console.warn("free trial lead capture unexpected warning:", leadError);
      }
    }

    trackAnalyticsEvent("free_trial_clicked", { source: "signup_form_submitted" });

    setMessage("Check your email for the confirmation link.");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
        <div className="mb-8 text-center">
          <div className="mx-auto flex justify-center">
            <ServiceOSLogo variant="stacked" size="mobile" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Start managing cleaning jobs, customers, and estimates.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSignUp}>
          <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              placeholder="Jordan Smith"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Company <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              placeholder="Northwind Services"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
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
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              placeholder="Create a secure password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        {message ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {message}
          </p>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
