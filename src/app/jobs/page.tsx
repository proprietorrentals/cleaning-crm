"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Customer = {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  building_size: string;
  cleaning_frequency: string;
  notes: string;
  created_at: string;
};

type Quote = {
  id: string;
  customer_id: string;
  square_footage: number;
  cleaning_frequency: string;
  extra_services: string[];
  notes: string;
  total_estimate: number;
  created_at: string;
};

type Job = {
  id: string;
  quote_id: string;
  customer_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  assigned_employee_id: string | null;
  assigned_employee: string | null;
  status: string;
  estimated_value: number;
  notes: string;
  signature_status: string | null;
  signature_reason: string | null;
  signature_notes: string | null;
  attempted_signature_at: string | null;
  created_at: string;
};

type MileageRequest = {
  id: string;
  from_job_id: string;
  to_job_id: string;
  employee_id: string;
  date: string;
  miles: number;
  notes: string | null;
  status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
};

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
};

type JobPhoto = {
  id: string;
  job_id: string;
  employee_id: string;
  photo_url: string;
  photo_type: "before" | "after" | "signature";
  notes: string | null;
  created_at: string;
};

type JobFormState = {
  quote_id: string;
  customer_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  assigned_employee_id: string;
  status: string;
  estimated_value: string;
  notes: string;
};

const emptyForm: JobFormState = {
  quote_id: "",
  customer_id: "",
  scheduled_date: "",
  scheduled_start_time: "08:00",
  assigned_employee_id: "",
  status: "Scheduled",
  estimated_value: "",
  notes: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimeValue(value: string | null | undefined) {
  if (!value) {
    return "8:00 AM";
  }

  const normalized = value.length === 5 ? `${value}:00` : value;
  return new Date(`1970-01-01T${normalized}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatVerification(job: Job) {
  if (job.signature_status === "signed") {
    return "Signed";
  }
  if (job.signature_status === "unavailable") {
    const reason = job.signature_reason || "Unavailable";
    const notes = job.signature_notes ? ` (${job.signature_notes})` : "";
    return `${reason}${notes}`;
  }
  return "Pending";
}

export default function JobsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [mileageRequests, setMileageRequests] = useState<MileageRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobPhotos, setJobPhotos] = useState<JobPhoto[]>([]);
  const [form, setForm] = useState<JobFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<JobPhoto | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setMessage(null);

    const [jobsResponse, customersResponse, quotesResponse, employeesResponse, mileageRequestsResponse] = await Promise.all([
      supabase.from("jobs").select("*").order("scheduled_date", { ascending: true }),
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("quotes").select("*").order("created_at", { ascending: false }),
      supabase
        .from("employees")
        .select("id,first_name,last_name,is_active")
        .eq("is_active", true)
        .order("first_name", { ascending: true }),
      supabase.from("mileage_requests").select("*").order("created_at", { ascending: false }),
    ]);

    if (jobsResponse.error) {
      console.error("❌ Failed to fetch jobs:", jobsResponse.error);
      setMessage(`❌ Error fetching jobs: ${jobsResponse.error.message}`);
    } else {
      setJobs(jobsResponse.data ?? []);
      console.log(`✓ Fetched ${jobsResponse.data?.length ?? 0} jobs from public.jobs table`);
    }

    if (customersResponse.error) {
      console.error("❌ Failed to fetch customers:", customersResponse.error);
      setMessage((current) => current ? `${current}; Also failed to fetch customers: ${customersResponse.error.message}` : `❌ Error fetching customers: ${customersResponse.error.message}`);
    } else {
      setCustomers(customersResponse.data ?? []);
      console.log(`✓ Fetched ${customersResponse.data?.length ?? 0} customers`);
    }

    if (quotesResponse.error) {
      console.error("❌ Failed to fetch quotes:", quotesResponse.error);
      setMessage((current) => current ? `${current}; Also failed to fetch quotes: ${quotesResponse.error.message}` : `❌ Error fetching quotes: ${quotesResponse.error.message}`);
    } else {
      setQuotes(quotesResponse.data ?? []);
      console.log(`✓ Fetched ${quotesResponse.data?.length ?? 0} quotes`);
    }

    if (employeesResponse.error) {
      console.error("❌ Failed to fetch employees:", employeesResponse.error);
      setMessage((current) =>
        current
          ? `${current}; Also failed to fetch employees: ${employeesResponse.error.message}`
          : `❌ Error fetching employees: ${employeesResponse.error.message}`,
      );
    } else {
      setEmployees(employeesResponse.data ?? []);
    }

    if (mileageRequestsResponse.error) {
      console.error("❌ Failed to fetch mileage requests:", mileageRequestsResponse.error);
      setMessage((current) =>
        current
          ? `${current}; Also failed to fetch mileage requests: ${mileageRequestsResponse.error.message}`
          : `❌ Error fetching mileage requests: ${mileageRequestsResponse.error.message}`,
      );
    } else {
      setMileageRequests(mileageRequestsResponse.data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

  useEffect(() => {
    const loadJobPhotos = async () => {
      if (!editingId) {
        setJobPhotos([]);
        return;
      }

      setLoadingPhotos(true);
      const { data: tenantId, error: tenantIdError } = await supabase.rpc("current_tenant_id");
      console.debug("Admin job photos diagnostics", {
        jobId: editingId,
        tenantId: tenantId ?? null,
        tenantIdError: tenantIdError?.message ?? null,
        query: 'from("job_photos").select("id,job_id,employee_id,photo_url,photo_type,notes,created_at").eq("job_id", jobId).order("created_at", { ascending: true })',
      });

      const { data, error } = await supabase
        .from("job_photos")
        .select("*")
        .eq("job_id", editingId)
        .order("created_at", { ascending: true });

      console.debug("Admin job photos query result", {
        jobId: editingId,
        count: data?.length ?? 0,
        error: error?.message ?? null,
      });

      if (error) {
        console.error("❌ Failed to fetch job photos:", error);
        setMessage(`❌ Error fetching job photos: ${error.message}`);
        setJobPhotos([]);
      } else {
        setJobPhotos((data ?? []) as JobPhoto[]);
      }

      setLoadingPhotos(false);
    };

    void loadJobPhotos();
  }, [editingId, supabase]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!form.customer_id || !form.scheduled_date) {
      setMessage("❌ Please select a customer and scheduled date.");
      setSaving(false);
      return;
    }

    const selectedEmployee = employees.find((employee) => employee.id === form.assigned_employee_id);

    const payload = {
      quote_id: form.quote_id || null,
      customer_id: form.customer_id,
      scheduled_date: form.scheduled_date,
      scheduled_start_time: form.scheduled_start_time || "08:00",
      assigned_employee_id: form.assigned_employee_id || null,
      assigned_employee: selectedEmployee
        ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
        : null,
      status: form.status,
      estimated_value: Number(form.estimated_value) || 0,
      notes: form.notes.trim(),
    };

    if (editingId) {
      const { error } = await supabase.from("jobs").update(payload).eq("id", editingId);
      if (error) {
        console.error("Update error:", error);
        setMessage(`❌ Error updating job: ${error.message}`);
        setSaving(false);
        return;
      }
      setMessage("✓ Job updated successfully.");
    } else {
      const { error } = await supabase.from("jobs").insert(payload);
      if (error) {
        console.error("Insert error:", error);
        setMessage(`❌ Error creating job: ${error.message}`);
        setSaving(false);
        return;
      }
      setMessage("✓ Job scheduled successfully.");
    }

    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
    await fetchData();
  };

  const handleEdit = (job: Job) => {
    const inferredEmployeeId =
      job.assigned_employee_id ??
      employees.find(
        (employee) => `${employee.first_name} ${employee.last_name}`.toLowerCase() === (job.assigned_employee ?? "").toLowerCase(),
      )?.id ??
      "";

    setEditingId(job.id);
    setForm({
      quote_id: job.quote_id || "",
      customer_id: job.customer_id,
      scheduled_date: job.scheduled_date,
      scheduled_start_time: job.scheduled_start_time ? job.scheduled_start_time.slice(0, 5) : "08:00",
      assigned_employee_id: inferredEmployeeId,
      status: job.status,
      estimated_value: String(job.estimated_value),
      notes: job.notes || "",
    });
    setMessage("Editing scheduled job.");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error);
      setMessage(`❌ Error deleting job: ${error.message}`);
      return;
    }

    setMessage("✓ Job deleted successfully.");
    await fetchData();
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    const { error } = await supabase.from("jobs").update({ status: newStatus }).eq("id", jobId);
    if (error) {
      console.error("Status update error:", error);
      setMessage(`❌ Error updating job status: ${error.message}`);
      return;
    }

    setMessage(`✓ Job status changed to ${newStatus}.`);
    await fetchData();
  };

  const handleMileageReview = async (requestId: string, nextStatus: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("mileage_requests")
      .update({
        status: nextStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      })
      .eq("id", requestId);

    if (error) {
      setMessage(`❌ Error updating mileage request: ${error.message}`);
      return;
    }

    setMessage(`✓ Mileage request ${nextStatus}.`);
    await fetchData();
  };

  const jobById = jobs.reduce<Record<string, Job>>((acc, job) => {
    acc[job.id] = job;
    return acc;
  }, {});

  const employeeById = employees.reduce<Record<string, Employee>>((acc, employee) => {
    acc[employee.id] = employee;
    return acc;
  }, {});

  const selectedJob = editingId ? jobs.find((job) => job.id === editingId) ?? null : null;

  const groupedJobPhotos = jobPhotos.reduce<Record<"before" | "after" | "signature", JobPhoto[]>>(
    (acc, photo) => {
      acc[photo.photo_type].push(photo);
      return acc;
    },
    { before: [], after: [], signature: [] },
  );

  const customerById = customers.reduce<Record<string, Customer>>((acc, customer) => {
    acc[customer.id] = customer;
    return acc;
  }, {});

  const formatEmployeeName = (employeeId: string) => {
    const employee = employeeById[employeeId];
    return employee ? `${employee.first_name} ${employee.last_name}` : employeeId;
  };

  const formatMileageJob = (jobId: string) => {
    const job = jobById[jobId];
    if (!job) return jobId;
    const customer = customerById[job.customer_id];
    return `${customer?.company_name ?? "Customer"} (${job.scheduled_date})`;
  };

  const createFromQuote = (quote: Quote) => {
    const customer = customers.find((c) => c.id === quote.customer_id);
    setForm({
      quote_id: quote.id,
      customer_id: quote.customer_id,
      scheduled_date: new Date().toISOString().split("T")[0],
      scheduled_start_time: "08:00",
      assigned_employee_id: "",
      status: "Scheduled",
      estimated_value: String(quote.total_estimate),
      notes: quote.notes || "",
    });
    setEditingId(null);
    setMessage(`✓ Quote from ${customer?.company_name || "customer"} loaded into the job form.`);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage(null);
    setJobPhotos([]);
    setPreviewPhoto(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Job scheduling</p>
            <h1 className="text-2xl font-semibold text-slate-900">Jobs</h1>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Back to dashboard
          </Link>
        </header>

        {message ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Available quotes</h2>
            <p className="mt-1 text-sm text-slate-500">Use a quote to pre-fill job information.</p>

            <div className="mt-4 space-y-3">
              {quotes.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No saved quotes yet. Create one in the Quotes page.</div>
              ) : (
                quotes.map((quote) => {
                  const customer = customers.find((c) => c.id === quote.customer_id);
                  return (
                    <div key={quote.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-900">{customer?.company_name || "Unknown"}</p>
                        <p className="text-sm text-slate-500">{quote.square_footage} sq ft • {formatCurrency(quote.total_estimate)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => createFromQuote(quote)}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                      >
                        Use quote
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Job details</h2>
                <p className="text-sm text-slate-500">Create and track cleaning job assignments.</p>
              </div>
              {editingId ? (
                <button type="button" onClick={resetForm} className="text-sm font-medium text-blue-600">
                  Clear
                </button>
              ) : null}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Customer</label>
                <select
                  value={form.customer_id}
                  onChange={(event) => setForm((current) => ({ ...current, customer_id: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="">Select a customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Scheduled date</label>
                  <input
                    type="date"
                    required
                    value={form.scheduled_date}
                    onChange={(event) => setForm((current) => ({ ...current, scheduled_date: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Scheduled start time</label>
                  <input
                    type="time"
                    required
                    value={form.scheduled_start_time}
                    onChange={(event) => setForm((current) => ({ ...current, scheduled_start_time: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Assigned employee (optional)</label>
                  <select
                    value={form.assigned_employee_id}
                    onChange={(event) => setForm((current) => ({ ...current, assigned_employee_id: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Estimated value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.estimated_value}
                    onChange={(event) => setForm((current) => ({ ...current, estimated_value: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="2500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                  placeholder="Access instructions or special requirements"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {saving ? "Saving..." : editingId ? "Update job" : "Schedule job"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Clear
                </button>
              </div>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Job photos</h3>
                  <p className="text-sm text-slate-500">
                    {selectedJob ? `Photos for ${selectedJob.scheduled_date}` : "Select a job to view uploaded photos."}
                  </p>
                </div>
                {editingId ? (
                  <span className="text-sm text-slate-500">{jobPhotos.length} uploaded</span>
                ) : null}
              </div>

              {!editingId ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  Choose a job row and click Edit to inspect before photos, after photos, and the customer signature.
                </div>
              ) : loadingPhotos ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading photos...</div>
              ) : jobPhotos.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  No photos have been uploaded for this job yet.
                </div>
              ) : (
                <div className="mt-4 space-y-6">
                  {([
                    ["before", "Before Photos"],
                    ["after", "After Photos"],
                    ["signature", "Customer Signature"],
                  ] as const).map(([type, label]) => {
                    const photosForType = groupedJobPhotos[type];

                    return (
                      <div key={type} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{label}</h4>
                          <span className="text-xs text-slate-500">{photosForType.length}</span>
                        </div>

                        {photosForType.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                            No {label.toLowerCase()} available.
                          </div>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {photosForType.map((photo) => {
                              const employee = employeeById[photo.employee_id];
                              const uploadTime = new Date(photo.created_at).toLocaleString();

                              return (
                                <button
                                  key={photo.id}
                                  type="button"
                                  onClick={() => setPreviewPhoto(photo)}
                                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                  <img
                                    src={photo.photo_url}
                                    alt={`${label} preview`}
                                    className="h-48 w-full object-cover transition group-hover:scale-[1.02]"
                                  />
                                  <div className="space-y-1 p-3">
                                    <p className="text-sm font-medium text-slate-900">{employee ? `${employee.first_name} ${employee.last_name}` : "Unknown employee"}</p>
                                    <p className="text-xs text-slate-500">Uploaded {uploadTime}</p>
                                    {photo.notes ? <p className="text-xs text-slate-500">{photo.notes}</p> : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">All jobs</h2>
              <p className="text-sm text-slate-500">{jobs.length} total jobs in system</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              ℹ️ No jobs found in database. Create jobs by approving quotes on the Quotes page.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Scheduled Date</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Start Time</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Employee</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Customer Verification</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">Value</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const customer = customers.find((c) => c.id === job.customer_id);
                    const statusColor =
                      job.status === "Completed"
                        ? "bg-green-50 text-green-700"
                        : job.status === "In Progress"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-blue-50 text-blue-700";

                    return (
                      <tr key={job.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{customer?.company_name || "Unknown"}</td>
                        <td className="px-4 py-3 text-slate-600">{job.scheduled_date}</td>
                        <td className="px-4 py-3 text-slate-600">{formatTimeValue(job.scheduled_start_time)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{job.assigned_employee || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>{formatVerification(job)}</p>
                          {job.attempted_signature_at ? (
                            <p className="text-xs text-slate-400">
                              {new Date(job.attempted_signature_at).toLocaleString()}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(job.estimated_value)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {job.status !== "Completed" && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(job.id, "Completed")}
                                className="rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-600 transition hover:bg-green-100"
                              >
                                ✓ Mark Complete
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEdit(job)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(job.id)}
                              className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Mileage Approval</h2>
              <p className="text-sm text-slate-500">Approve or reject submitted mileage between assigned jobs.</p>
            </div>
            <span className="text-sm text-slate-500">{mileageRequests.length} requests</span>
          </div>

          {mileageRequests.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No mileage requests yet.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Employee</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">From Job</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">To Job</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Miles</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Notes</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mileageRequests.map((request) => {
                    const statusColor =
                      request.status === "approved"
                        ? "bg-emerald-50 text-emerald-700"
                        : request.status === "rejected"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700";

                    return (
                      <tr key={request.id} className="border-b border-slate-100">
                        <td className="px-4 py-3 text-slate-700">{formatEmployeeName(request.employee_id)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatMileageJob(request.from_job_id)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatMileageJob(request.to_job_id)}</td>
                        <td className="px-4 py-3 text-slate-700">{request.date}</td>
                        <td className="px-4 py-3 text-slate-700">{Number(request.miles).toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>
                            {request.status}
                          </span>
                          {request.reviewed_at ? (
                            <p className="mt-1 text-xs text-slate-400">Reviewed {new Date(request.reviewed_at).toLocaleString()}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{request.notes || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {request.status === "pending" ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleMileageReview(request.id, "approved")}
                                className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMileageReview(request.id, "rejected")}
                                className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {previewPhoto ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Photo preview</p>
                  <p className="text-xs text-slate-500">{previewPhoto.photo_type} • {new Date(previewPhoto.created_at).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
              <div className="bg-slate-950 p-3">
                <img src={previewPhoto.photo_url} alt="Full size job photo" className="max-h-[78vh] w-full object-contain" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
