import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureAccessAndUser } from "@/lib/ai-workforce/management";
import {
  AI_ASSIGNMENT_STATUSES,
  AI_GOAL_PRIORITIES,
} from "@/lib/ai-workforce/management-types";
import { resolveAiEmployee } from "@/lib/ai-workforce/resolve-employee";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const createTaskSchema = z.object({
  employeeSlug: z.string().min(1),
  goalId: z.string().uuid().nullable().optional(),
  title: z.string().min(3).max(200),
  instructions: z.string().max(8000).default(""),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: z.enum(AI_GOAL_PRIORITIES),
  status: z.enum(AI_ASSIGNMENT_STATUSES).default("assigned"),
  approvalRequired: z.boolean().default(true),
  isRecurring: z.boolean().default(false),
  recurringTaskId: z.string().uuid().nullable().optional(),
  weekStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

type AssignmentRow = {
  id: string;
  goal_id: string | null;
  recurring_task_id: string | null;
  title: string;
  instructions: string;
  due_date: string;
  week_start_date: string | null;
  priority: string;
  status: string;
  approval_required: boolean;
  is_recurring: boolean;
  is_one_time: boolean;
  rejection_feedback: string | null;
  blocked_reason: string | null;
  assigned_at: string;
  started_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  employee: Array<{ slug: string; name: string }> | null;
};

export async function GET(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const supabase = await createServerSupabaseClient();
  const userId = access.userId;

  const employeeSlug = request.nextUrl.searchParams.get("employeeSlug");
  const status = request.nextUrl.searchParams.get("status");
  const priority = request.nextUrl.searchParams.get("priority");
  const dueDateStart = request.nextUrl.searchParams.get("dueDateStart");
  const dueDateEnd = request.nextUrl.searchParams.get("dueDateEnd");

  let resolvedEmployeeId: string | null = null;
  if (employeeSlug) {
    const resolved = await resolveAiEmployee(supabase, employeeSlug);
    if (!resolved.employeeRow || resolved.errorMessage) {
      return NextResponse.json(
        {
          success: false,
          message: resolved.errorMessage ?? "Unknown AI employee.",
        },
        { status: 400 },
      );
    }
    resolvedEmployeeId = resolved.employeeRow.id;
  }

  let query = supabase
    .from("ai_assignments")
    .select(
      "id,goal_id,recurring_task_id,title,instructions,due_date,week_start_date,priority,status,approval_required,is_recurring,is_one_time,rejection_feedback,blocked_reason,assigned_at,started_at,submitted_at,approved_at,completed_at,created_at,updated_at,employee:ai_employees(slug,name)",
    )
    .eq("super_admin_user_id", userId)
    .order("due_date", { ascending: true });

  if (resolvedEmployeeId) query = query.eq("employee_id", resolvedEmployeeId);
  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (dueDateStart) query = query.gte("due_date", dueDateStart);
  if (dueDateEnd) query = query.lte("due_date", dueDateEnd);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to load assignments." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    tasks: ((data ?? []) as AssignmentRow[]).map((row) => ({
      id: row.id,
      employeeSlug: row.employee?.[0]?.slug,
      employeeName: row.employee?.[0]?.name,
      goalId: row.goal_id,
      recurringTaskId: row.recurring_task_id,
      title: row.title,
      instructions: row.instructions,
      dueDate: row.due_date,
      weekStartDate: row.week_start_date,
      priority: row.priority,
      status: row.status,
      approvalRequired: row.approval_required,
      isRecurring: row.is_recurring,
      isOneTime: row.is_one_time,
      rejectionFeedback: row.rejection_feedback,
      blockedReason: row.blocked_reason,
      assignedAt: row.assigned_at,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      approvedAt: row.approved_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
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
  const parsed = createTaskSchema.safeParse(body);
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
  const resolved = await resolveAiEmployee(supabase, parsed.data.employeeSlug);
  if (!resolved.employeeRow || resolved.errorMessage) {
    return NextResponse.json(
      {
        success: false,
        message: resolved.errorMessage ?? "Unknown AI employee.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("ai_assignments")
    .insert({
      employee_id: resolved.employeeRow.id,
      super_admin_user_id: access.userId,
      goal_id: parsed.data.goalId ?? null,
      recurring_task_id: parsed.data.recurringTaskId ?? null,
      title: parsed.data.title,
      instructions: parsed.data.instructions,
      due_date: parsed.data.dueDate,
      week_start_date: parsed.data.weekStartDate ?? null,
      priority: parsed.data.priority,
      status: parsed.data.status,
      approval_required: parsed.data.approvalRequired,
      is_recurring: parsed.data.isRecurring,
      is_one_time: !parsed.data.isRecurring,
      started_at:
        parsed.data.status === "in_progress" ? new Date().toISOString() : null,
      submitted_at:
        parsed.data.status === "awaiting_approval"
          ? new Date().toISOString()
          : null,
      approved_at:
        parsed.data.status === "approved" ? new Date().toISOString() : null,
      completed_at:
        parsed.data.status === "completed" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to create assignment." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, taskId: data.id });
}
