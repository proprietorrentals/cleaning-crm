import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { JobCompletionReportPDF } from "@/lib/job-report-pdf";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { NextRequest, NextResponse } from "next/server";

type GenerateJobReportBody = {
  jobId?: string;
};

type JobRow = {
  id: string;
  tenant_id: string;
  customer_id: string;
  assigned_employee_id: string | null;
  scheduled_date: string;
  status: string;
  notes: string | null;
  signature_url: string | null;
  signature_status: string | null;
  signature_reason: string | null;
  signature_notes: string | null;
};

type CustomerRow = {
  id: string;
  tenant_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type EmployeeRow = {
  id: string;
  tenant_id: string;
  auth_user_id: string | null;
  is_active: boolean;
  role: string;
  first_name: string;
  last_name: string;
};

type TimeEntryRow = {
  id: string;
  employee_id: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_minutes: number | null;
};

type MileageRow = {
  id: string;
  miles: number;
};

type JobPhotoRow = {
  id: string;
  photo_url: string;
  photo_type: "before" | "after" | "signature";
  notes: string | null;
  created_at: string;
};

type SettingsRow = {
  company_name: string | null;
  company_logo_url: string | null;
};

function makeEmployeeName(employee: Pick<EmployeeRow, "first_name" | "last_name">) {
  return `${employee.first_name} ${employee.last_name}`.trim();
}

function hoursBetween(clockIn: string | null, clockOut: string | null) {
  if (!clockIn || !clockOut) return 0;
  const inMs = new Date(clockIn).getTime();
  const outMs = new Date(clockOut).getTime();
  if (!Number.isFinite(inMs) || !Number.isFinite(outMs) || outMs <= inMs) return 0;
  return (outMs - inMs) / 3_600_000;
}

function fallbackSummary(input: {
  customerName: string;
  jobDate: string;
  totalHours: number;
  totalMileage: number;
  beforeCount: number;
  afterCount: number;
  signatureStatus: string;
  notes: string | null;
}) {
  return [
    `The cleaning service for ${input.customerName} on ${input.jobDate} was completed with a total recorded labor time of ${input.totalHours.toFixed(2)} hours and ${input.totalMileage.toFixed(2)} miles logged for related travel.`,
    `Documentation includes ${input.beforeCount} before photo${input.beforeCount === 1 ? "" : "s"} and ${input.afterCount} after photo${input.afterCount === 1 ? "" : "s"}.`,
    `Customer signature status: ${input.signatureStatus}.`,
    input.notes?.trim() ? `Team notes: ${input.notes.trim()}` : "No additional employee notes were supplied for this completion.",
  ].join(" ");
}

async function generateAiSummary(input: {
  customerName: string;
  propertyAddress: string | null;
  jobDate: string;
  employees: string[];
  totalHours: number;
  totalMileage: number;
  beforeCount: number;
  afterCount: number;
  signatureStatus: string;
  notes: string | null;
}) {
  const fallback = fallbackSummary({
    customerName: input.customerName,
    jobDate: input.jobDate,
    totalHours: input.totalHours,
    totalMileage: input.totalMileage,
    beforeCount: input.beforeCount,
    afterCount: input.afterCount,
    signatureStatus: input.signatureStatus,
    notes: input.notes,
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        temperature: 0.4,
        max_output_tokens: 220,
        input: [
          {
            role: "system",
            content:
              "Write a concise, professional cleaning completion summary for a customer-facing PDF report. Use plain business language and do not mention AI.",
          },
          {
            role: "user",
            content: JSON.stringify(input),
          },
        ],
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as { output_text?: string };
    const text = payload.output_text?.trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateJobReportBody;
    const jobId = body.jobId?.trim();

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required." }, { status: 400 });
    }

    const serverSupabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await serverSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const adminClient = createAdminSupabaseClient();

    const { data: job, error: jobError } = await adminClient
      .from("jobs")
      .select(
        "id,tenant_id,customer_id,assigned_employee_id,scheduled_date,status,notes,signature_url,signature_status,signature_reason,signature_notes",
      )
      .eq("id", jobId)
      .maybeSingle<JobRow>();

    if (jobError || !job) {
      return NextResponse.json({ error: jobError?.message || "Job not found." }, { status: 404 });
    }

    if (job.status !== "Completed") {
      return NextResponse.json({ error: "Reports can only be generated for completed jobs." }, { status: 400 });
    }

    const [{ data: tenantAdmin }, { data: supervisor }] = await Promise.all([
      adminClient
        .from("tenant_admins")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("tenant_id", job.tenant_id)
        .maybeSingle(),
      adminClient
        .from("employees")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("tenant_id", job.tenant_id)
        .eq("is_active", true)
        .in("role", ["Supervisor", "Manager", "supervisor", "manager"])
        .maybeSingle(),
    ]);

    if (!tenantAdmin && !supervisor) {
      return NextResponse.json({ error: "You do not have permission to generate reports for this job." }, { status: 403 });
    }

    const [
      customerResponse,
      timeEntriesResponse,
      mileageResponse,
      photosResponse,
      settingsResponse,
      assignedEmployeeResponse,
    ] = await Promise.all([
      adminClient
        .from("customers")
        .select("id,tenant_id,company_name,contact_name,email,phone,address")
        .eq("id", job.customer_id)
        .maybeSingle<CustomerRow>(),
      adminClient
        .from("time_entries")
        .select("id,employee_id,clock_in_time,clock_out_time,total_minutes")
        .eq("job_id", job.id)
        .order("clock_in_time", { ascending: true }),
      adminClient
        .from("mileage_requests")
        .select("id,miles")
        .eq("status", "approved")
        .or(`from_job_id.eq.${job.id},to_job_id.eq.${job.id}`),
      adminClient
        .from("job_photos")
        .select("id,photo_url,photo_type,notes,created_at")
        .eq("job_id", job.id)
        .order("created_at", { ascending: true }),
      adminClient
        .from("settings")
        .select("company_name,company_logo_url")
        .eq("tenant_id", job.tenant_id)
        .maybeSingle<SettingsRow>(),
      job.assigned_employee_id
        ? adminClient
            .from("employees")
            .select("id,tenant_id,auth_user_id,is_active,role,first_name,last_name")
            .eq("id", job.assigned_employee_id)
            .maybeSingle<EmployeeRow>()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (customerResponse.error || !customerResponse.data) {
      return NextResponse.json(
        { error: customerResponse.error?.message || "Customer not found for job." },
        { status: 400 },
      );
    }

    if (timeEntriesResponse.error) {
      return NextResponse.json({ error: timeEntriesResponse.error.message }, { status: 400 });
    }

    if (mileageResponse.error) {
      return NextResponse.json({ error: mileageResponse.error.message }, { status: 400 });
    }

    if (photosResponse.error) {
      return NextResponse.json({ error: photosResponse.error.message }, { status: 400 });
    }

    if (settingsResponse.error) {
      return NextResponse.json({ error: settingsResponse.error.message }, { status: 400 });
    }

    if (assignedEmployeeResponse.error) {
      return NextResponse.json({ error: assignedEmployeeResponse.error.message }, { status: 400 });
    }

    const customer = customerResponse.data;
    const timeEntries = (timeEntriesResponse.data ?? []) as TimeEntryRow[];
    const mileageRows = (mileageResponse.data ?? []) as MileageRow[];
    const photos = (photosResponse.data ?? []) as JobPhotoRow[];
    const settings = settingsResponse.data;
    const assignedEmployee = assignedEmployeeResponse.data;

    const employeeIds = [...new Set(timeEntries.map((entry) => entry.employee_id))];
    if (assignedEmployee?.id) {
      employeeIds.push(assignedEmployee.id);
    }

    const uniqueEmployeeIds = [...new Set(employeeIds)];

    const { data: employeesForEntries, error: employeesError } = uniqueEmployeeIds.length
      ? await adminClient
          .from("employees")
          .select("id,tenant_id,auth_user_id,is_active,role,first_name,last_name")
          .in("id", uniqueEmployeeIds)
      : { data: [], error: null };

    if (employeesError) {
      return NextResponse.json({ error: employeesError.message }, { status: 400 });
    }

    const employeeMap = new Map((employeesForEntries ?? []).map((employee) => [employee.id, employee as EmployeeRow]));

    const clockRows = timeEntries.map((entry) => {
      const employee = employeeMap.get(entry.employee_id);
      const totalHours =
        entry.total_minutes && Number.isFinite(entry.total_minutes)
          ? Number(entry.total_minutes) / 60
          : hoursBetween(entry.clock_in_time, entry.clock_out_time);

      return {
        employeeName: employee ? makeEmployeeName(employee) : "Unknown employee",
        clockIn: entry.clock_in_time,
        clockOut: entry.clock_out_time,
        totalHours,
      };
    });

    const totalHours = clockRows.reduce((sum, row) => sum + row.totalHours, 0);
    const totalMileage = mileageRows.reduce((sum, row) => sum + Number(row.miles ?? 0), 0);

    const beforePhotos = photos.filter((photo) => photo.photo_type === "before");
    const afterPhotos = photos.filter((photo) => photo.photo_type === "after");
    const signaturePhoto = photos.find((photo) => photo.photo_type === "signature");

    const employeeNames = [...new Set([
      ...(assignedEmployee ? [makeEmployeeName(assignedEmployee)] : []),
      ...clockRows.map((row) => row.employeeName),
    ])].filter(Boolean);

    const checklist = [
      { label: "Job marked completed", done: job.status === "Completed" },
      { label: "Before photos captured", done: beforePhotos.length > 0 },
      { label: "After photos captured", done: afterPhotos.length > 0 },
      { label: "Customer verification recorded", done: !!(job.signature_status || signaturePhoto || job.signature_url) },
      { label: "Clock in/out entries captured", done: clockRows.length > 0 },
      { label: "Mileage recorded", done: totalMileage > 0 },
    ];

    const aiSummary = await generateAiSummary({
      customerName: customer.company_name,
      propertyAddress: customer.address,
      jobDate: job.scheduled_date,
      employees: employeeNames,
      totalHours,
      totalMileage,
      beforeCount: beforePhotos.length,
      afterCount: afterPhotos.length,
      signatureStatus:
        job.signature_status === "signed" || signaturePhoto || job.signature_url
          ? "signed"
          : `customer unavailable${job.signature_reason ? ` (${job.signature_reason})` : ""}`,
      notes: job.notes,
    });

    const doc = React.createElement(JobCompletionReportPDF, {
      companyName: settings?.company_name || "ServiceFlow CRM",
      companyLogoUrl: settings?.company_logo_url || null,
      customer: {
        companyName: customer.company_name,
        contactName: customer.contact_name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      job: {
        id: job.id,
        date: job.scheduled_date,
        status: job.status,
        notes: job.notes,
        signatureStatus: job.signature_status,
        signatureReason: job.signature_reason,
        signatureNotes: job.signature_notes,
      },
      employees: employeeNames.map((name, index) => ({ id: `${index}`, name })),
      clockRows,
      totalHours,
      totalMileage,
      beforePhotos,
      afterPhotos,
      signaturePhotoUrl: signaturePhoto?.photo_url || job.signature_url || null,
      aiSummary,
      checklist,
      generatedAtIso: new Date().toISOString(),
    });

    const pdfBuffer = await pdf(doc as React.ReactElement<DocumentProps>).toBuffer();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportPath = `${job.id}/job-report-${timestamp}.pdf`;

    const { error: uploadError } = await adminClient.storage.from("job-reports").upload(reportPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data: publicUrlData } = adminClient.storage.from("job-reports").getPublicUrl(reportPath);
    const reportUrl = publicUrlData.publicUrl;

    const { error: updateJobError } = await adminClient
      .from("jobs")
      .update({
        report_url: reportUrl,
        report_generated_at: new Date().toISOString(),
        report_generated_by: user.id,
        report_ai_summary: aiSummary,
      })
      .eq("id", job.id);

    if (updateJobError) {
      return NextResponse.json({ error: updateJobError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      reportUrl,
      customerEmail: customer.email,
      customerName: customer.company_name,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate job report.",
      },
      { status: 500 },
    );
  }
}
