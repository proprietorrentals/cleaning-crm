"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { ServiceOSBrand } from "@/components/serviceos-brand";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        // Already logged in, redirect to admin dashboard
        router.replace("/");
      }
      setLoading(false);
    };
    checkAuth();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-10">
      {/* Logo and Header */}
      <div className="mb-12 text-center">
        <div className="mx-auto flex justify-center mb-4">
          <ServiceOSBrand variant="full" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">ServiceOS</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">Operate with Confidence.</p>
        <p className="mt-2 text-lg text-slate-600">Choose your portal to get started</p>
      </div>

      {/* Portal Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3 w-full max-w-5xl">
        {/* Admin Portal Card */}
        <Link
          href="/admin-login"
          className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-lg transition hover:shadow-xl hover:border-blue-300"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-600 mb-4 group-hover:bg-blue-200 transition">
            ⚙
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Admin Portal</h2>
          <p className="text-sm text-slate-600 mb-4">
            Manage customers, quotes, jobs, invoices, and team operations.
          </p>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:gap-3 transition">
            Sign In
            <span>→</span>
          </div>
        </Link>

        {/* Employee Portal Card */}
        <Link
          href="/employee-login"
          className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-lg transition hover:shadow-xl hover:border-emerald-300"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-semibold text-emerald-600 mb-4 group-hover:bg-emerald-200 transition">
            👤
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Employee Portal</h2>
          <p className="text-sm text-slate-600 mb-4">
            View assigned jobs, clock in/out, update status, and share photos.
          </p>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 group-hover:gap-3 transition">
            Sign In
            <span>→</span>
          </div>
        </Link>

        {/* Customer Portal Card */}
        <Link
          href="/customer-auth"
          className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-lg transition hover:shadow-xl hover:border-amber-300"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl font-semibold text-amber-600 mb-4 group-hover:bg-amber-200 transition">
            🏢
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Customer Portal</h2>
          <p className="text-sm text-slate-600 mb-4">
            Track jobs, quotes, invoices, and request service.
          </p>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 group-hover:gap-3 transition">
            Sign In
            <span>→</span>
          </div>
        </Link>
      </div>

      {/* Super Admin Link (Small and Subtle) */}
      <div className="mt-12 text-center text-sm text-slate-500">
        <Link href="/super-admin/login" className="text-blue-600 hover:text-blue-700 font-medium">
          Super Admin
        </Link>
      </div>
    </div>
  );
}
