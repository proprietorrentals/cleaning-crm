"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Job = {
  id: string;
  quote_id: string;
  customer_id: string;
  scheduled_date: string;
  assigned_employee: string | null;
  status: string;
  estimated_value: number;
  notes: string;
  signature_url: string | null;
  signature_status: string | null;
  signature_reason: string | null;
  signature_notes: string | null;
  attempted_signature_at: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CustomerJobsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchJobs = async (customerId: string) => {
    console.log("📋 DEBUG - Fetching all jobs for customer:", customerId);

    const { data: jobsData, error: jobsError } = await supabase
      .from("jobs")
      .select("*")
      .eq("customer_id", customerId)
      .order("scheduled_date", { ascending: true });

    if (jobsError) {
      console.error("❌ Failed to fetch jobs:", {
        message: jobsError.message,
        code: jobsError.code,
        details: jobsError.details,
      });
      setMessage(`Error loading jobs: ${jobsError.message}`);
    } else {
      console.log(`✓ Fetched ${jobsData?.length || 0} jobs:`, jobsData);
      setJobs(jobsData || []);
    }
  };

  const handleRefresh = async () => {
    if (!customerId) return;
    setRefreshing(true);
    setMessage(null);
    await fetchJobs(customerId);
    setRefreshing(false);
    console.log("✓ Jobs refreshed");
  };

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/customer-auth");
        return;
      }

      console.log("🔐 DEBUG - Fetching jobs for user:", session.user.id);

      // Get customer ID
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (customerError) {
        console.error("❌ Failed to fetch customer:", customerError);
        setMessage(`Error loading customer: ${customerError.message}`);
        setLoading(false);
        return;
      }

      if (!customer) {
        console.warn("⚠️ No customer profile found for user", session.user.id);
        setMessage("⚠️ No customer profile found. Please contact support.");
        setLoading(false);
        return;
      }

      console.log("👤 DEBUG - Found customer:", customer.id);
      setCustomerId(customer.id);

      // Fetch all jobs for this customer
      await fetchJobs(customer.id);

      setLoading(false);
    };

    fetchData();
  }, [supabase, router]);

  const scheduledJobs = jobs.filter((j) => j.status !== "Completed");
  const completedJobs = jobs.filter((j) => j.status === "Completed");

  const JobCard = ({ job }: { job: Job }) => {
    const statusColor =
      job.status === "Completed"
        ? "bg-green-50 text-green-700"
        : job.status === "In Progress"
          ? "bg-yellow-50 text-yellow-700"
          : "bg-blue-50 text-blue-700";

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-600">{formatDate(job.scheduled_date)}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(job.estimated_value)}
            </p>
          </div>
          <span className={`rounded-lg px-3 py-1 text-sm font-medium ${statusColor}`}>
            {job.status}
          </span>
        </div>

        {job.assigned_employee && (
          <div className="mb-3">
            <p className="text-sm text-slate-600">Assigned to: {job.assigned_employee}</p>
          </div>
        )}

        {job.notes && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-700">Notes:</p>
            <p className="text-sm text-slate-600 mt-1">{job.notes}</p>
          </div>
        )}

        {(job.signature_status || job.signature_url) && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-700">Customer verification</p>
            {job.signature_status === "signed" || job.signature_url ? (
              <p className="mt-1 text-sm text-emerald-700">Signed by customer</p>
            ) : (
              <p className="mt-1 text-sm text-slate-600">Unavailable: {job.signature_reason || "Not specified"}</p>
            )}
            {job.signature_notes ? (
              <p className="mt-1 text-xs text-slate-500">Notes: {job.signature_notes}</p>
            ) : null}
            {job.attempted_signature_at ? (
              <p className="mt-1 text-xs text-slate-400">Recorded: {new Date(job.attempted_signature_at).toLocaleString()}</p>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/customer-portal" className="text-slate-600 hover:text-slate-900">
              ← Back to Portal
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Your Jobs</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {refreshing ? "Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {message && (
          <div
            className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
              message.includes("❌") || message.includes("Error") || message.includes("⚠️")
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-2"></div>
              <p className="text-slate-600">Loading jobs...</p>
            </div>
          </div>
        ) : (
          <>
            {/* All Jobs */}
            {jobs.length > 0 && (
              <section className="mb-12">
                <h2 className="mb-4 text-xl font-bold text-slate-900">All Jobs ({jobs.length})</h2>
                <div className="grid gap-4">
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </section>
            )}

            {/* Job Status Breakdown */}
            {jobs.length > 0 && (
              <>
                {scheduledJobs.length > 0 && (
                  <section className="mb-8">
                    <h2 className="mb-4 text-lg font-semibold text-slate-700">Breakdown - Scheduled & In Progress ({scheduledJobs.length})</h2>
                    <div className="grid gap-4 opacity-75">
                      {scheduledJobs.map((job) => (
                        <JobCard key={job.id} job={job} />
                      ))}
                    </div>
                  </section>
                )}

                {completedJobs.length > 0 && (
                  <section>
                    <h2 className="mb-4 text-lg font-semibold text-slate-700">Breakdown - Completed ({completedJobs.length})</h2>
                    <div className="grid gap-4 opacity-75">
                      {completedJobs.map((job) => (
                        <JobCard key={job.id} job={job} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* No Jobs */}
            {jobs.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-slate-600">No jobs scheduled yet. Approve a quote to get started!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
