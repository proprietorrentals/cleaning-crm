"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveEmployeeByAuthUserId } from "@/lib/supabase/employee-session";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { ServiceFlowBrand } from "@/components/serviceflow-brand";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Job = {
  id: string;
  customer_id: string;
  scheduled_date: string;
  status: string;
  estimated_value: number;
  notes: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  signature_url?: string | null;
  signature_status?: string | null;
  signature_reason?: string | null;
  signature_notes?: string | null;
  attempted_signature_at?: string | null;
};

type Customer = { id: string; company_name: string; address: string | null; phone: string | null };
type EmployeeProfile = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string | null;
  is_active: boolean;
};
type TimeEntry = {
  id: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_minutes: number | null;
  status: string | null;
};
type JobPhoto = { id: string; photo_url: string; photo_type: string; notes: string | null };

const STATUS_SEQUENCE = ["Scheduled", "In Progress", "Completed"] as const;

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v ?? 0);
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function elapsed(from: string) {
  const ms = Date.now() - new Date(from).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const STATUS_STYLES: Record<string, string> = {
  Scheduled:     "bg-blue-100 text-blue-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Completed:     "bg-emerald-100 text-emerald-700",
};

export default function JobDetailPage() {
  const params  = useParams<{ id: string }>();
  const jobId   = Array.isArray(params.id) ? params.id[0] : params.id;
  const router  = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [profile,    setProfile]    = useState<EmployeeProfile | null>(null);
  const [job,        setJob]        = useState<Job | null>(null);
  const [customer,   setCustomer]   = useState<Customer | null>(null);
  const [timeEntry,  setTimeEntry]  = useState<TimeEntry | null>(null);
  const [photos,     setPhotos]     = useState<JobPhoto[]>([]);
  const [notes,      setNotes]      = useState("");
  const [loading,    setLoading]    = useState(true);
  const [busy,       setBusy]       = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [sigSaved,   setSigSaved]   = useState(false);
  const [signatureMode, setSignatureMode] = useState<"present" | "unavailable">("present");
  const [signatureReason, setSignatureReason] = useState("");
  const [signatureNotes, setSignatureNotes] = useState("");
  const [message,    setMessage]    = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [elapsed_,   setElapsed]    = useState("");
  const [isDrawing,  setIsDrawing]  = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ─── load data ──────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    if (!jobId) {
      console.debug("Employee job detail route missing job id.");
      setMessage({ type: "error", text: "Job not found or not assigned to you." });
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.replace("/employee-login"); return; }

    const { profile: emp, errorMessage: employeeError } = await getActiveEmployeeByAuthUserId(
      supabase,
      session.user.id,
    );

    if (employeeError || !emp) { router.replace("/employee-login?reason=Access+not+enabled"); return; }
    setProfile(emp);

    console.debug("Employee job detail lookup", {
      jobId,
      employeeId: emp.id,
    });

    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("id,customer_id,scheduled_date,status,estimated_value,notes")
      .eq("id", jobId)
      .eq("assigned_employee_id", emp.id)
      .maybeSingle();

    if (jobError) {
      console.debug("Employee job detail schema/query error", {
        jobId,
        employeeId: emp.id,
        error: jobError.message,
      });
      setMessage({ type: "error", text: `Database schema/query error: ${jobError.message}` });
      setLoading(false);
      return;
    }

    if (!jobData) {
      console.debug("Employee job detail lookup denied", {
        jobId,
        employeeId: emp.id,
        found: false,
        error: null,
      });
      setMessage({ type: "error", text: "Job not found or not assigned to you." });
      setLoading(false);
      return;
    }

    setJob(jobData);
    setNotes(jobData.notes ?? "");

    const { data: optionalJobFields, error: optionalJobFieldsError } = await supabase
      .from("jobs")
      .select("started_at,completed_at,signature_url,signature_status,signature_reason,signature_notes,attempted_signature_at")
      .eq("id", jobId)
      .maybeSingle();

    if (optionalJobFieldsError) {
      console.debug("Employee job detail optional fields query error", {
        jobId,
        employeeId: emp.id,
        error: optionalJobFieldsError.message,
      });
      setMessage({ type: "error", text: `Database schema/query error: ${optionalJobFieldsError.message}` });
    } else if (optionalJobFields) {
      setJob((current) => (current ? { ...current, ...optionalJobFields } : current));
    }

    const [custRes, teRes, photoRes] = await Promise.all([
      supabase.from("customers").select("id,company_name,address,phone").eq("id", jobData.customer_id).maybeSingle(),
      supabase
        .from("time_entries")
        .select("id,clock_in_time,clock_out_time,total_minutes,status")
        .eq("job_id", jobId)
        .eq("employee_id", emp.id)
        .is("clock_out_time", null)
        .order("clock_in_time", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("job_photos").select("id,photo_url,photo_type,notes").eq("job_id", jobId).order("created_at"),
    ]);

    setCustomer(custRes.data);
    setTimeEntry(teRes.data);
    setPhotos(photoRes.data ?? []);
    setLoading(false);
  }, [supabase, router, jobId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!job) return;
    if (job.signature_status === "unavailable") {
      setSignatureMode("unavailable");
      setSignatureReason(job.signature_reason ?? "");
      setSignatureNotes(job.signature_notes ?? "");
      return;
    }

    setSignatureMode("present");
    setSignatureReason("");
    setSignatureNotes("");
  }, [job]);

  // Tick elapsed time while clocked in
  useEffect(() => {
    const startedAt = timeEntry?.clock_in_time;
    if (!startedAt) return;
    const id = setInterval(() => setElapsed(elapsed(startedAt)), 5_000);
    setElapsed(elapsed(startedAt));
    return () => clearInterval(id);
  }, [timeEntry]);

  // ─── clock in / out ─────────────────────────────────────────────────────────

  const handleClockIn = async () => {
    if (!profile || !job) return;
    setBusy(true);
    setMessage(null);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        employee_id: profile.id,
        job_id: job.id,
        clock_in_time: now,
        status: "clocked_in",
      })
      .select()
      .maybeSingle();
    if (!error && data) {
      setTimeEntry(data);
      setMessage({ type: "success", text: "Clock in recorded successfully." });
    } else if (error) {
      setMessage({ type: "error", text: error.message });
    }
    setBusy(false);
  };

  const handleClockOut = async () => {
    if (!timeEntry) return;
    setBusy(true);
    setMessage(null);
    const startedAt = timeEntry.clock_in_time;
    const clockOutAt = new Date().toISOString();
    const totalMinutes = startedAt
      ? Math.max(0, Math.round((new Date(clockOutAt).getTime() - new Date(startedAt).getTime()) / 60_000))
      : null;
    const { data, error } = await supabase
      .from("time_entries")
      .update({
        clock_out_time: clockOutAt,
        total_minutes: totalMinutes,
        status: "clocked_out",
      })
      .eq("id", timeEntry.id)
      .select()
      .maybeSingle();
    if (!error && data) {
      setTimeEntry(null);
      setElapsed("");
      setMessage({ type: "success", text: `Clock out recorded successfully. Total time worked: ${startedAt ? elapsed(startedAt) : "0m"}.` });
    } else if (error) {
      setMessage({ type: "error", text: error.message });
    }
    setBusy(false);
  };

  // ─── status update ──────────────────────────────────────────────────────────

  const handleStatusUpdate = async (newStatus: string) => {
    if (!job || !profile) return;
    setBusy(true);
    const patch: Record<string, unknown> = { status: newStatus };
    if (newStatus === "In Progress" && !job.started_at) {
      patch.started_at = new Date().toISOString();
    }
    if (newStatus === "Completed" && !job.completed_at) {
      patch.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("jobs")
      .update(patch)
      .eq("id", job.id)
      .eq("assigned_employee_id", profile.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setJob((current) => (current ? { ...current, ...patch, status: newStatus } : current));
      setMessage({ type: "success", text: `Job updated to ${newStatus}.` });
    }
    setBusy(false);
  };

  // ─── notes ──────────────────────────────────────────────────────────────────

  const handleSaveNotes = async () => {
    if (!job || !profile) return;
    setBusy(true);
    const { error } = await supabase
      .from("jobs")
      .update({ notes })
      .eq("id", job.id)
      .eq("assigned_employee_id", profile.id);
    if (error) setMessage({ type: "error", text: error.message });
    else        setMessage({ type: "success", text: "Notes saved." });
    setBusy(false);
  };

  // ─── photo upload ────────────────────────────────────────────────────────────

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "before" | "after") => {
    const file = e.target.files?.[0];
    if (!file || !profile || !job) return;
    setPhotoUploading(true);
    setMessage(null);

    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${job.id}/${type}-${Date.now()}.${ext}`;

    const pathJobId = path.split("/")[0] ?? null;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const authUserId = session?.user?.id ?? null;

    const [employeeRes, jobContextRes] = await Promise.all([
      authUserId
        ? supabase
            .from("employees")
            .select("id,tenant_id")
            .eq("auth_user_id", authUserId)
            .eq("is_active", true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("jobs")
        .select("id,assigned_employee_id,tenant_id")
        .eq("id", job.id)
        .maybeSingle(),
    ]);

    const resolvedEmployeeId = employeeRes.data?.id ?? null;
    const resolvedEmployeeTenantId = employeeRes.data?.tenant_id ?? null;
    const resolvedJobTenantId = jobContextRes.data?.tenant_id ?? null;
    const selectedJobId = jobContextRes.data?.id ?? null;
    const jobAssignedEmployeeId = jobContextRes.data?.assigned_employee_id ?? null;
    const jobTenantId = jobContextRes.data?.tenant_id ?? null;
    const assignedMatch =
      !!resolvedEmployeeId && jobAssignedEmployeeId === resolvedEmployeeId;
    const tenantMatch =
      !!resolvedEmployeeTenantId && !!resolvedJobTenantId
        ? resolvedEmployeeTenantId === resolvedJobTenantId
        : false;

    const { data: previewUrlData } = supabase.storage.from("job-photos").getPublicUrl(path);
    const insertPayload = {
      job_id: job.id,
      employee_id: resolvedEmployeeId,
      tenant_id: resolvedJobTenantId,
      photo_url: previewUrlData.publicUrl,
      photo_type: type,
      notes: null,
    };

    const uploadDiagnostic = {
      auth_user_id: authUserId,
      resolved_employees_id: resolvedEmployeeId,
      resolved_employees_tenant_id: resolvedEmployeeTenantId,
      selected_job_id: selectedJobId,
      jobs_assigned_employee_id: jobAssignedEmployeeId,
      jobs_tenant_id: jobTenantId,
      assignment_matches: assignedMatch,
      tenant_matches: tenantMatch,
      job_photos_insert_payload: insertPayload,
      supabase_error_code: null as string | null,
      supabase_error_message: null as string | null,
      supabase_error_details: null as string | null,
      supabase_error_hint: null as string | null,
      failure_stage: null as "precheck" | "storage_upload" | "job_photos_insert" | null,
    };

    console.info("Employee photo upload diagnostics", uploadDiagnostic);

    if (pathJobId !== job.id || !assignedMatch || !tenantMatch || !resolvedEmployeeId || !resolvedJobTenantId) {
      const blockedDiagnostic = {
        ...uploadDiagnostic,
        failure_stage: "precheck" as const,
      };
      console.error("Employee photo upload blocked diagnostics", blockedDiagnostic);
      setMessage({
        type: "error",
        text: JSON.stringify(blockedDiagnostic, null, 2),
      });
      setPhotoUploading(false);
      e.target.value = "";
      return;
    }

    const { error: uploadError } = await supabase.storage.from("job-photos").upload(path, file);
    if (uploadError) {
      const storageError = uploadError as {
        code?: string | null;
        message?: string | null;
        details?: string | null;
        hint?: string | null;
      };
      const failedDiagnostic = {
        ...uploadDiagnostic,
        supabase_error_code: storageError.code ?? null,
        supabase_error_message: storageError.message ?? uploadError.message,
        supabase_error_details: storageError.details ?? null,
        supabase_error_hint: storageError.hint ?? null,
        failure_stage: "storage_upload" as const,
      };
      console.error("Employee photo upload failed diagnostics", failedDiagnostic);
      setMessage({ type: "error", text: JSON.stringify(failedDiagnostic, null, 2) });
      setPhotoUploading(false);
      return;
    }

    console.info("job_photos photo insert payload diagnostics", uploadDiagnostic);

    const { error: insertError } = await supabase.from("job_photos").insert(insertPayload);

    if (insertError) {
      const failedDiagnostic = {
        ...uploadDiagnostic,
        supabase_error_code: insertError.code ?? null,
        supabase_error_message: insertError.message,
        supabase_error_details: insertError.details ?? null,
        supabase_error_hint: insertError.hint ?? null,
        failure_stage: "job_photos_insert" as const,
      };
      console.error("job_photos photo insert failed diagnostics", failedDiagnostic);
      setMessage({ type: "error", text: JSON.stringify(failedDiagnostic, null, 2) });
    } else {
      const photoUrl = insertPayload.photo_url;
      setPhotos((p) => [...p, { id: Date.now().toString(), photo_url: photoUrl, photo_type: type, notes: null }]);
    }
    setPhotoUploading(false);
    e.target.value = "";
  };

  // ─── signature canvas ────────────────────────────────────────────────────────

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = "touches" in e ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.lineWidth   = 2.5;
    ctx.strokeStyle = "#1e293b";
    ctx.lineCap     = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setSigSaved(false);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !profile || !job) return;
    setBusy(true);
    setMessage(null);

    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (!blob) { setBusy(false); return; }

    const path = `${job.id}/signature-${Date.now()}.png`;
    const pathJobId = path.split("/")[0] ?? null;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const authUserId = session?.user?.id ?? null;

    const [employeeRes, jobContextRes] = await Promise.all([
      authUserId
        ? supabase
            .from("employees")
            .select("id,tenant_id")
            .eq("auth_user_id", authUserId)
            .eq("is_active", true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("jobs")
        .select("id,assigned_employee_id,tenant_id")
        .eq("id", job.id)
        .maybeSingle(),
    ]);

    const resolvedEmployeeId = employeeRes.data?.id ?? null;
    const resolvedEmployeeTenantId = employeeRes.data?.tenant_id ?? null;
    const resolvedJobTenantId = jobContextRes.data?.tenant_id ?? null;
    const selectedJobId = jobContextRes.data?.id ?? null;
    const jobAssignedEmployeeId = jobContextRes.data?.assigned_employee_id ?? null;
    const jobTenantId = jobContextRes.data?.tenant_id ?? null;
    const assignedMatch =
      !!resolvedEmployeeId && jobAssignedEmployeeId === resolvedEmployeeId;
    const tenantMatch =
      !!resolvedEmployeeTenantId && !!resolvedJobTenantId
        ? resolvedEmployeeTenantId === resolvedJobTenantId
        : false;

    const { data: previewUrlData } = supabase.storage.from("job-photos").getPublicUrl(path);
    const signatureInsertPayload = {
      job_id: job.id,
      employee_id: resolvedEmployeeId,
      tenant_id: resolvedJobTenantId,
      photo_url: previewUrlData.publicUrl,
      photo_type: "signature" as const,
      notes: null,
    };

    const signatureUploadDiagnostic = {
      auth_user_id: authUserId,
      resolved_employees_id: resolvedEmployeeId,
      resolved_employees_tenant_id: resolvedEmployeeTenantId,
      selected_job_id: selectedJobId,
      jobs_assigned_employee_id: jobAssignedEmployeeId,
      jobs_tenant_id: jobTenantId,
      assignment_matches: assignedMatch,
      tenant_matches: tenantMatch,
      job_photos_insert_payload: signatureInsertPayload,
      supabase_error_code: null as string | null,
      supabase_error_message: null as string | null,
      supabase_error_details: null as string | null,
      supabase_error_hint: null as string | null,
      failure_stage: null as "precheck" | "storage_upload" | "job_photos_insert" | null,
    };

    console.info("Employee signature upload diagnostics", signatureUploadDiagnostic);

    if (pathJobId !== job.id || !assignedMatch || !tenantMatch || !resolvedEmployeeId || !resolvedJobTenantId) {
      const blockedDiagnostic = {
        ...signatureUploadDiagnostic,
        failure_stage: "precheck" as const,
      };
      console.error("Employee signature upload blocked diagnostics", blockedDiagnostic);
      setMessage({
        type: "error",
        text: JSON.stringify(blockedDiagnostic, null, 2),
      });
      setBusy(false);
      return;
    }

    const { error: uploadError } = await supabase.storage.from("job-photos").upload(path, blob, { contentType: "image/png" });

    if (uploadError) {
      const storageError = uploadError as {
        code?: string | null;
        message?: string | null;
        details?: string | null;
        hint?: string | null;
      };
      const failedDiagnostic = {
        ...signatureUploadDiagnostic,
        supabase_error_code: storageError.code ?? null,
        supabase_error_message: storageError.message ?? uploadError.message,
        supabase_error_details: storageError.details ?? null,
        supabase_error_hint: storageError.hint ?? null,
        failure_stage: "storage_upload" as const,
      };
      console.error("Employee signature upload failed diagnostics", failedDiagnostic);
      setMessage({ type: "error", text: JSON.stringify(failedDiagnostic, null, 2) });
      setBusy(false);
      return;
    }

    console.info("job_photos signature insert payload diagnostics", signatureUploadDiagnostic);

    const { error: signatureInsertError } = await supabase.from("job_photos").insert(signatureInsertPayload);

    if (signatureInsertError) {
      const failedDiagnostic = {
        ...signatureUploadDiagnostic,
        supabase_error_code: signatureInsertError.code ?? null,
        supabase_error_message: signatureInsertError.message,
        supabase_error_details: signatureInsertError.details ?? null,
        supabase_error_hint: signatureInsertError.hint ?? null,
        failure_stage: "job_photos_insert" as const,
      };
      console.error("job_photos signature insert failed diagnostics", failedDiagnostic);
      setMessage({ type: "error", text: JSON.stringify(failedDiagnostic, null, 2) });
      setBusy(false);
      return;
    }

    const signatureUrl = signatureInsertPayload.photo_url;

    const verificationPatch = {
      signature_url: signatureUrl,
      signature_status: "signed",
      signature_reason: null,
      signature_notes: null,
      attempted_signature_at: new Date().toISOString(),
    };

    const { error: jobError } = await supabase
      .from("jobs")
      .update(verificationPatch)
      .eq("id", job.id)
      .eq("assigned_employee_id", profile.id);
    if (jobError) {
      setMessage({ type: "error", text: jobError.message });
    } else {
      setJob((j) =>
        j
          ? {
              ...j,
              ...verificationPatch,
            }
          : j,
      );
      setPhotos((current) => [
        ...current,
        {
          id: `signature-${Date.now()}`,
          photo_url: signatureUrl,
          photo_type: "signature",
          notes: null,
        },
      ]);
      setSigSaved(true);
      setMessage({ type: "success", text: "Signature saved and attached to this job." });
    }
    setBusy(false);
  };

  const saveUnavailableVerification = async () => {
    if (!job || !profile) return;

    if (!signatureReason) {
      setMessage({ type: "error", text: "Select a reason when the customer is unavailable." });
      return;
    }

    if (signatureReason === "Other" && !signatureNotes.trim()) {
      setMessage({ type: "error", text: "Notes are required when reason is Other." });
      return;
    }

    setBusy(true);
    setMessage(null);

    const verificationPatch = {
      signature_url: null,
      signature_status: "unavailable",
      signature_reason: signatureReason,
      signature_notes: signatureReason === "Other" ? signatureNotes.trim() : null,
      attempted_signature_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("jobs")
      .update(verificationPatch)
      .eq("id", job.id)
      .eq("assigned_employee_id", profile.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setJob((j) => (j ? { ...j, ...verificationPatch } : j));
      setSigSaved(false);
      setMessage({ type: "success", text: "Customer unavailable reason saved." });
    }

    setBusy(false);
  };

  // ─── render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-sm text-slate-500">Loading job…</p>
        </div>
      </div>
    );
  }

  const currentStatusIndex = job ? STATUS_SEQUENCE.indexOf(job.status as (typeof STATUS_SEQUENCE)[number]) : -1;
  const beforePhotos = photos.filter((p) => p.photo_type === "before");
  const afterPhotos  = photos.filter((p) => p.photo_type === "after");
  const activeClockStart = timeEntry?.clock_in_time;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-3 py-3 pb-8 sm:px-6 sm:py-6">

        {/* Header */}
        <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <ServiceFlowBrand subtitle="Employee Portal" />
              <Link href="/employee-portal" className="mt-4 flex items-center gap-1 text-sm text-blue-600 hover:underline">
                ← Back to dashboard
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <InstallPwaButton
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              />
              <button
                type="button"
                onClick={async () => { await supabase.auth.signOut(); router.replace("/employee-login"); }}
                className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {message && (
          <div className={`rounded-2xl px-4 py-3 text-sm border ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {!job ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Job not found or not assigned to you.
          </div>
        ) : (
          <>
            {/* Job overview */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{customer?.company_name ?? "Job"}</h1>
                  {customer?.address && <p className="mt-0.5 text-sm text-slate-500">{customer.address}</p>}
                  {customer?.phone   && <p className="mt-0.5 text-sm text-slate-500">{customer.phone}</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLES[job.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {job.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Scheduled</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(job.scheduled_date)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Value</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(job.estimated_value)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Assigned to</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {profile ? `${profile.first_name} ${profile.last_name}` : "—"}
                  </p>
                </div>
              </div>
            </section>

            {/* Clock in / out */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Time Tracking</h2>
              {timeEntry ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      Clocked in at {activeClockStart ? new Date(activeClockStart).toLocaleTimeString() : "—"}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-blue-700">{elapsed_ || (activeClockStart ? elapsed(activeClockStart) : "0m")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClockOut}
                    disabled={busy}
                    className="w-full rounded-xl bg-red-600 px-5 py-3 text-base font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition sm:w-auto sm:py-2.5 sm:text-sm"
                  >
                    Clock Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">Not currently clocked in for this job.</p>
                  <button
                    type="button"
                    onClick={handleClockIn}
                    disabled={busy}
                    className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition sm:w-auto sm:py-2.5 sm:text-sm"
                  >
                    Clock In
                  </button>
                </div>
              )}
            </section>

            {/* Status actions */}
            {job.status !== "Completed" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-slate-900">Job Status</h2>
                <div className="flex flex-wrap gap-3">
                  {currentStatusIndex < STATUS_SEQUENCE.indexOf("In Progress") && (
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate("In Progress")}
                      disabled={busy}
                      className="w-full rounded-xl bg-amber-500 px-5 py-3 text-base font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition sm:w-auto sm:py-2.5 sm:text-sm"
                    >
                      Start Job
                    </button>
                  )}
                  {currentStatusIndex < STATUS_SEQUENCE.indexOf("Completed") && (
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate("Completed")}
                      disabled={busy}
                      className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition sm:w-auto sm:py-2.5 sm:text-sm"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Before / After photos */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Photos</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {(["before", "after"] as const).map((type) => {
                  const list = type === "before" ? beforePhotos : afterPhotos;
                  return (
                    <div key={type}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium capitalize text-slate-700">{type} ({list.length})</p>
                        <label className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${type === "before" ? "bg-slate-600 hover:bg-slate-700" : "bg-blue-600 hover:bg-blue-700"} ${photoUploading ? "opacity-50 pointer-events-none" : ""}`}>
                          {photoUploading ? "Uploading…" : "+ Photo"}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            onChange={(e) => handlePhotoUpload(e, type)}
                            disabled={photoUploading}
                          />
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {list.map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={p.id} src={p.photo_url} alt={`${type} photo`} className="aspect-square w-full rounded-xl object-cover" />
                        ))}
                        {list.length === 0 && (
                          <div className="col-span-2 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">
                            No {type} photos yet
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Customer signature */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-base font-semibold text-slate-900">Customer Verification</h2>
              <p className="mb-4 text-sm text-slate-500">Choose one verification path for this completed service.</p>

              <div className="mb-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="customer-verification"
                    value="present"
                    checked={signatureMode === "present"}
                    onChange={() => setSignatureMode("present")}
                  />
                  Customer is present
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="customer-verification"
                    value="unavailable"
                    checked={signatureMode === "unavailable"}
                    onChange={() => setSignatureMode("unavailable")}
                  />
                  Customer unavailable
                </label>
              </div>

              {signatureMode === "present" ? (
                <div>
                  {job.signature_url ? (
                    <div>
                      <p className="mb-2 text-xs font-medium text-emerald-600">✓ Signature captured</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={job.signature_url} alt="Customer signature" className="rounded-xl border border-slate-200 bg-slate-50 max-h-40 w-full object-contain p-2" />
                      <button
                        type="button"
                        onClick={() => {
                          setJob((j) => (j ? { ...j, signature_url: null, signature_status: null } : j));
                          setSigSaved(false);
                        }}
                        className="mt-2 text-xs text-slate-400 hover:text-slate-700 transition"
                      >
                        Re-capture
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 touch-none">
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={200}
                          className="h-40 w-full cursor-crosshair"
                          onMouseDown={startDraw}
                          onMouseMove={draw}
                          onMouseUp={endDraw}
                          onMouseLeave={endDraw}
                          onTouchStart={startDraw}
                          onTouchMove={draw}
                          onTouchEnd={endDraw}
                        />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-600 hover:bg-slate-50 transition sm:w-auto sm:py-2 sm:text-sm"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={saveSignature}
                          disabled={busy || sigSaved}
                          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition sm:w-auto sm:py-2 sm:text-sm"
                        >
                          {busy ? "Saving…" : "Save Signature"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Reason (required)</label>
                    <select
                      value={signatureReason}
                      onChange={(e) => setSignatureReason(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                      required
                    >
                      <option value="">Select a reason...</option>
                      <option value="After-hours cleaning">After-hours cleaning</option>
                      <option value="Customer unavailable">Customer unavailable</option>
                      <option value="Contact not on site">Contact not on site</option>
                      <option value="Refused to sign">Refused to sign</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {signatureReason === "Other" && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes (required)</label>
                      <textarea
                        value={signatureNotes}
                        onChange={(e) => setSignatureNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none resize-none"
                        placeholder="Provide details for why signature was unavailable..."
                        required
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={saveUnavailableVerification}
                    disabled={busy}
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition sm:w-auto sm:py-2 sm:text-sm"
                  >
                    {busy ? "Saving…" : "Save Verification"}
                  </button>
                </div>
              )}
            </section>

            {/* Notes */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Job Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add notes about this job…"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none resize-none"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={busy}
                  className="w-full rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition sm:w-auto sm:py-2 sm:text-sm"
                >
                  {busy ? "Saving…" : "Save Notes"}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
