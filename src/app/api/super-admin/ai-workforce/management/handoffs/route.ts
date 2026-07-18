import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureAccessAndUser } from "@/lib/ai-workforce/management";
import { AI_HANDOFF_STATUSES } from "@/lib/ai-workforce/management-types";
import { resolveAiEmployee } from "@/lib/ai-workforce/resolve-employee";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const handoffSchema = z.object({
  fromEmployeeSlug: z.string().min(1),
  toEmployeeSlug: z.string().min(1),
  assignmentId: z.string().uuid().nullable().optional(),
  summary: z.string().min(3).max(8000),
  attachedSavedContentId: z.string().uuid().nullable().optional(),
  requestedNextAction: z.string().max(2000).default(""),
  status: z.enum(AI_HANDOFF_STATUSES).default("pending"),
});

const handoffPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(AI_HANDOFF_STATUSES),
});

type HandoffRow = {
  id: string;
  assignment_id: string | null;
  summary: string;
  attached_saved_content_id: string | null;
  requested_next_action: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  updated_at: string;
  from_employee: Array<{ slug: string; name: string }> | null;
  to_employee: Array<{ slug: string; name: string }> | null;
};

export async function GET(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const supabase = await createServerSupabaseClient();
  const userId = access.userId;
  const status = request.nextUrl.searchParams.get("status");

  let query = supabase
    .from("ai_handoffs")
    .select(
      "id,assignment_id,summary,attached_saved_content_id,requested_next_action,status,created_at,accepted_at,completed_at,updated_at,from_employee:ai_employees!ai_handoffs_from_employee_id_fkey(slug,name),to_employee:ai_employees!ai_handoffs_to_employee_id_fkey(slug,name)",
    )
    .eq("super_admin_user_id", userId)
    .order("updated_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to load handoffs." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    handoffs: ((data ?? []) as HandoffRow[]).map((row) => ({
      id: row.id,
      fromEmployeeSlug: row.from_employee?.[0]?.slug,
      fromEmployeeName: row.from_employee?.[0]?.name,
      toEmployeeSlug: row.to_employee?.[0]?.slug,
      toEmployeeName: row.to_employee?.[0]?.name,
      assignmentId: row.assignment_id,
      summary: row.summary,
      attachedSavedContentId: row.attached_saved_content_id,
      requestedNextAction: row.requested_next_action,
      status: row.status,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = handoffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const [fromResolved, toResolved] = await Promise.all([
    resolveAiEmployee(supabase, parsed.data.fromEmployeeSlug),
    resolveAiEmployee(supabase, parsed.data.toEmployeeSlug),
  ]);

  if (!fromResolved.employeeRow || fromResolved.errorMessage) {
    return NextResponse.json(
      {
        success: false,
        message: fromResolved.errorMessage ?? "Unknown AI employee.",
      },
      { status: 400 },
    );
  }

  if (!toResolved.employeeRow || toResolved.errorMessage) {
    return NextResponse.json(
      {
        success: false,
        message: toResolved.errorMessage ?? "Unknown AI employee.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("ai_handoffs")
    .insert({
      super_admin_user_id: access.userId,
      from_employee_id: fromResolved.employeeRow.id,
      to_employee_id: toResolved.employeeRow.id,
      assignment_id: parsed.data.assignmentId ?? null,
      summary: parsed.data.summary,
      attached_saved_content_id: parsed.data.attachedSavedContentId ?? null,
      requested_next_action: parsed.data.requestedNextAction,
      status: parsed.data.status,
      accepted_at:
        parsed.data.status === "accepted" ? new Date().toISOString() : null,
      completed_at:
        parsed.data.status === "completed" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to create handoff." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, handoffId: data.id });
}

export async function PATCH(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = handoffPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {
    status: parsed.data.status,
  };

  if (parsed.data.status === "accepted") {
    patch.accepted_at = new Date().toISOString();
  }
  if (parsed.data.status === "completed") {
    patch.completed_at = new Date().toISOString();
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("ai_handoffs")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("super_admin_user_id", access.userId);

  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to update handoff." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
