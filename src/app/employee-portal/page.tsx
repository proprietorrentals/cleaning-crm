"use client";

import { createClient } from "@/lib/supabase/client";
import { getActiveEmployeeByAuthUserId } from "@/lib/supabase/employee-session";
import { ServiceFlowBrand } from "@/components/serviceflow-brand";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type EmployeeProfile = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string | null;
  is_active: boolean;
};

type Job = {
  id: string;
  customer_id: string;
  scheduled_date: string;
  status: string;
  estimated_value: number;
  notes: string | null;
  assigned_employee: string | null;
};

type Customer = {
  id: string;
  company_name: string;
  address: string | null;
};

type TimeEntry = {
  id: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_time_worked: string | null;
  status: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isoDateValue(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .split("T")[0];
}

function formatDuration(from: string | null) {
  if (!from) return "0m";
  const ms = Date.now() - new Date(from).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function EmployeePortalPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customersById, setCustomersById] = useState<Record<string, Customer>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [timeEntry, setTimeEntry] = useState<TimeEntry | null>(null);
  const [elapsedStr, setElapsedStr] = useState("");
  const [clockBusy, setClockBusy] = useState(false);
  const [mileageBusy, setMileageBusy] = useState(false);
  const [mileageFromJobId, setMileageFromJobId] = useState("");
  const [mileageToJobId, setMileageToJobId] = useState("");
  const [mileageNotes, setMileageNotes] = useState("");
  const [mileageEstimatedMiles, setMileageEstimatedMiles] = useState<string | null>(null);
  const [mileageManualMiles, setMileageManualMiles] = useState("");
  const [mileageNeedsManual, setMileageNeedsManual] = useState(false);
  const [mileageError, setMileageError] = useState<string | null>(null);
  const [mileageSuccess, setMileageSuccess] = useState<string | null>(null);
  const activeClockStart = timeEntry?.clock_in_time;

  useEffect(() => {
    const loadPortal = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/employee-login");
        return;
      }

      const { profile: employee, errorMessage: employeeError } = await getActiveEmployeeByAuthUserId(
        supabase,
        session.user.id,
      );

      if (employeeError || !employee) {
        await supabase.auth.signOut();
        router.replace("/employee-login?reason=Employee%20access%20is%20not%20enabled%20for%20this%20account.");
        return;
      }

      setProfile(employee);

      const { data: assignedJobs, error: jobsError } = await supabase
        .from("jobs")
        .select("id,customer_id,scheduled_date,status,estimated_value,notes,assigned_employee")
        .eq("assigned_employee_id", employee.id)
        .order("scheduled_date", { ascending: true });

      if (jobsError) {
        setMessage(`Unable to load assigned jobs: ${jobsError.message}`);
        setJobs([]);
        setLoading(false);
        return;
      }

      const safeJobs = assignedJobs ?? [];
      setJobs(safeJobs);

      const customerIds = [...new Set(safeJobs.map((job) => job.customer_id))];
      if (customerIds.length > 0) {
        const { data: customers, error: customerError } = await supabase
          .from("customers")
          .select("id,company_name,address")
          .in("id", customerIds);

        if (!customerError) {
          const map = (customers ?? []).reduce<Record<string, Customer>>((acc, customer) => {
            acc[customer.id] = customer;
            return acc;
          }, {});
          setCustomersById(map);
        }
      }

      // Fetch open time entry (no job — dashboard-level clock)
      const { data: openEntry } = await supabase
        .from("time_entries")
        .select("id,clock_in_time,clock_out_time,total_time_worked,status")
        .eq("employee_id", employee.id)
        .is("clock_out_time", null)
        .is("job_id", null)
        .maybeSingle();

      if (openEntry) setTimeEntry(openEntry);

      setLoading(false);
    };

    loadPortal();
  }, [router, supabase]);

  useEffect(() => {
    const startedAt = timeEntry?.clock_in_time;
    if (!startedAt) { setElapsedStr(""); return; }
    const tick = () => {
      const ms = Date.now() - new Date(startedAt).getTime();
      const h  = Math.floor(ms / 3_600_000);
      const m  = Math.floor((ms % 3_600_000) / 60_000);
      setElapsedStr(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 5_000);
    return () => clearInterval(id);
  }, [timeEntry]);

  const handleClockIn = async () => {
    if (!profile) return;
    setClockBusy(true);
    setMessage(null);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        employee_id: profile.id,
        job_id: null,
        clock_in_time: now,
        status: "clocked_in",
      })
      .select()
      .single();
    if (!error && data) {
      setTimeEntry(data);
      setMessage("Clock in recorded successfully.");
    } else if (error) {
      setMessage(`Clock in failed: ${error.message}`);
    }
    setClockBusy(false);
  };

  const handleClockOut = async () => {
    if (!timeEntry) return;
    setClockBusy(true);
    setMessage(null);
    const startedAt = timeEntry.clock_in_time;
    const clockOutAt = new Date().toISOString();
    const { error } = await supabase
      .from("time_entries")
      .update({
        clock_out_time: clockOutAt,
        total_time_worked: startedAt ? `${Math.max(0, Math.round((new Date(clockOutAt).getTime() - new Date(startedAt).getTime()) / 1000))} seconds` : null,
        status: "clocked_out",
      })
      .eq("id", timeEntry.id);
    if (!error) {
      setTimeEntry(null);
      setElapsedStr("");
      setMessage(`Clock out recorded successfully. Total time worked: ${formatDuration(startedAt)}.`);
    } else {
      setMessage(`Clock out failed: ${error.message}`);
    }
    setClockBusy(false);
  };

  const calculateMileage = async () => {
    setMileageBusy(true);
    setMileageError(null);
    setMileageSuccess(null);

    const response = await fetch("/api/mileage/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromJobId: mileageFromJobId,
        toJobId: mileageToJobId,
      }),
    });

    const payload = (await response.json()) as { miles?: number; error?: string; fromAddress?: string; toAddress?: string; date?: string };

    if (!response.ok) {
      setMileageEstimatedMiles(null);
      setMileageNeedsManual(true);
      setMileageManualMiles("");
      setMileageError(payload.error || "Unable to calculate mileage automatically.");
      setMileageBusy(false);
      return;
    }

    setMileageEstimatedMiles(String(payload.miles ?? 0));
    setMileageNeedsManual(false);
    setMileageManualMiles("");
    setMileageSuccess(`Estimated mileage calculated for ${payload.fromAddress} → ${payload.toAddress}.`);
    setMileageBusy(false);
  };

  const submitMileage = async () => {
    if (!profile) return;

    const selectedFromJob = jobs.find((job) => job.id === mileageFromJobId);
    const selectedToJob = jobs.find((job) => job.id === mileageToJobId);

    if (!selectedFromJob || !selectedToJob) {
      setMileageError("Select both Job A and Job B.");
      return;
    }

    const milesValue = mileageNeedsManual ? Number(mileageManualMiles) : Number(mileageEstimatedMiles);
    if (!Number.isFinite(milesValue) || milesValue <= 0) {
      setMileageError(mileageNeedsManual ? "Enter manual miles to submit." : "Calculate mileage first.");
      return;
    }

    setMileageBusy(true);
    setMileageError(null);
    setMileageSuccess(null);

    const { error } = await supabase.from("mileage_requests").insert({
      from_job_id: selectedFromJob.id,
      to_job_id: selectedToJob.id,
      employee_id: profile.id,
      date: selectedFromJob.scheduled_date,
      miles: milesValue,
      notes: mileageNotes.trim() || null,
      status: "pending",
    });

    if (error) {
      setMileageError(error.message);
      setMileageBusy(false);
      return;
    }

    setMileageSuccess("Mileage submitted for approval.");
    setMileageNotes("");
    setMileageEstimatedMiles(null);
    setMileageManualMiles("");
    setMileageNeedsManual(false);
    setMileageFromJobId("");
    setMileageToJobId("");
    setMileageBusy(false);
  };

  const today = isoDateValue();
  const todaysJobs = jobs.filter((job) => job.scheduled_date === today);
  const upcomingJobs = jobs.filter((job) => job.scheduled_date > today);
  const inProgressCount = jobs.filter((job) => job.status === "In Progress").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <ServiceFlowBrand subtitle="Employee Portal" />
              <h1 className="mt-4 text-2xl font-semibold text-slate-900">Your Work Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">
                {profile
                  ? `${profile.first_name} ${profile.last_name} · ${profile.role}${profile.department ? ` · ${profile.department}` : ""}`
                  : "Loading profile..."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/jobs"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Jobs
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.replace("/employee-login");
                }}
                className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {message ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>
        ) : null}

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Assigned jobs</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{jobs.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Today</p>
            <p className="mt-2 text-3xl font-semibold text-blue-700">{todaysJobs.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Upcoming</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{upcomingJobs.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-700">{inProgressCount}</p>
          </article>
        </section>

        {/* Clock in / out widget */}
        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Time Tracking</h2>
              {timeEntry ? (
                <p className="mt-1 text-sm text-slate-500">
                  Clocked in at {activeClockStart ? new Date(activeClockStart).toLocaleTimeString() : "—"} &mdash; <span className="font-semibold text-blue-700">{elapsedStr}</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-500">Not clocked in</p>
              )}
            </div>
            {timeEntry ? (
              <button
                type="button"
                onClick={handleClockOut}
                disabled={clockBusy}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {clockBusy ? "Saving…" : "Clock Out"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClockIn}
                disabled={clockBusy}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {clockBusy ? "Saving…" : "Clock In"}
              </button>
            )}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Mileage Tracking</h2>
              <p className="mt-1 text-sm text-slate-500">Calculate mileage between two assigned jobs and submit it for approval.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Job A</label>
              <select
                value={mileageFromJobId}
                onChange={(event) => {
                  setMileageFromJobId(event.target.value);
                  setMileageEstimatedMiles(null);
                  setMileageNeedsManual(false);
                  setMileageError(null);
                  setMileageSuccess(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Select Job A...</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {customersById[job.customer_id]?.company_name ?? "Customer"} ({job.scheduled_date})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Job B</label>
              <select
                value={mileageToJobId}
                onChange={(event) => {
                  setMileageToJobId(event.target.value);
                  setMileageEstimatedMiles(null);
                  setMileageNeedsManual(false);
                  setMileageError(null);
                  setMileageSuccess(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Select Job B...</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {customersById[job.customer_id]?.company_name ?? "Customer"} ({job.scheduled_date})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={calculateMileage}
              disabled={mileageBusy || !mileageFromJobId || !mileageToJobId}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {mileageBusy ? "Calculating..." : "Calculate Mileage"}
            </button>
          </div>

          {mileageError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {mileageError}
            </div>
          ) : null}

          {mileageSuccess ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {mileageSuccess}
            </div>
          ) : null}

          {mileageEstimatedMiles ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Estimated miles</p>
              <p className="text-2xl font-semibold text-slate-900">{Number(mileageEstimatedMiles).toFixed(2)} mi</p>
            </div>
          ) : null}

          {mileageNeedsManual ? (
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Manual miles</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={mileageManualMiles}
                onChange={(event) => setMileageManualMiles(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                placeholder="Enter mileage if automatic calculation fails"
              />
            </div>
          ) : null}

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={mileageNotes}
              onChange={(event) => setMileageNotes(event.target.value)}
              className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              placeholder="Add trip notes or justification for this mileage claim"
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={submitMileage}
              disabled={mileageBusy}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
            >
              {mileageBusy ? "Submitting..." : "Submit for Approval"}
            </button>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Today's Jobs</h2>
              <span className="text-sm text-slate-500">{todaysJobs.length}</span>
            </div>
            <div className="mt-3 space-y-3">
              {loading ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">Loading...</p>
              ) : todaysJobs.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No jobs assigned for today.</p>
              ) : (
                todaysJobs.map((job) => (
                  <div key={job.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">{customersById[job.customer_id]?.company_name ?? "Customer"}</p>
                      <Link
                        href={`/employee-portal/jobs/${job.id}`}
                        className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition"
                      >
                        View
                      </Link>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{job.status}</p>
                    {job.notes ? <p className="mt-2 text-sm text-slate-600">{job.notes}</p> : null}
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Jobs</h2>
              <span className="text-sm text-slate-500">{upcomingJobs.length}</span>
            </div>
            <div className="mt-3 space-y-3">
              {loading ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">Loading...</p>
              ) : upcomingJobs.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No upcoming jobs assigned.</p>
              ) : (
                upcomingJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{customersById[job.customer_id]?.company_name ?? "Customer"}</p>
                        <span className="text-xs text-blue-700">{formatDate(job.scheduled_date)}</span>
                      </div>
                      <Link
                        href={`/employee-portal/jobs/${job.id}`}
                        className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition"
                      >
                        View
                      </Link>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{job.status}</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{formatCurrency(job.estimated_value)}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">All Assigned Jobs</h2>
            <span className="text-sm text-slate-500">{jobs.length}</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            {loading ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">Loading assigned jobs...</p>
            ) : jobs.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">No assigned jobs available.</p>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Customer</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-slate-100">
                      <td className="px-2 py-3 text-slate-700">{formatDate(job.scheduled_date)}</td>
                      <td className="px-2 py-3 font-medium text-slate-900">{customersById[job.customer_id]?.company_name ?? "Customer"}</td>
                      <td className="px-2 py-3 text-slate-700">{job.status}</td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-900">{formatCurrency(job.estimated_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
