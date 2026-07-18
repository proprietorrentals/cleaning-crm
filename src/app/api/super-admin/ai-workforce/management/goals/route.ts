import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ensureAccessAndUser,
  startOfWeekIso,
} from "@/lib/ai-workforce/management";
import {
  AI_GOAL_PRIORITIES,
  AI_GOAL_STATUSES,
} from "@/lib/ai-workforce/management-types";
import { resolveAiEmployee } from "@/lib/ai-workforce/resolve-employee";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const createGoalSchema = z.object({
  employeeSlug: z.string().min(1),
  title: z.string().min(3).max(200),
  description: z.string().max(4000).default(""),
  weekStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: z.enum(AI_GOAL_PRIORITIES),
  status: z.enum(AI_GOAL_STATUSES).default("not_started"),
  successMetric: z.string().max(500).default(""),
  notes: z.string().max(4000).default(""),
});

const updateGoalSchema = createGoalSchema.partial().extend({
  id: z.string().uuid(),
  progressPercent: z.number().int().min(0).max(100).optional(),
});

type GoalRow = {
  id: string;
  title: string;
  description: string;
  week_start_date: string;
  due_date: string;
  priority: string;
  status: string;
  success_metric: string;
  notes: string;
  progress_percent: number;
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
  const weekStartDate = request.nextUrl.searchParams.get("weekStartDate");

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
    .from("ai_weekly_goals")
    .select(
      "id,title,description,week_start_date,due_date,priority,status,success_metric,notes,progress_percent,created_at,updated_at,employee:ai_employees(slug,name)",
    )
    .eq("super_admin_user_id", userId)
    .order("due_date", { ascending: true });

  if (resolvedEmployeeId) query = query.eq("employee_id", resolvedEmployeeId);
  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (weekStartDate) query = query.eq("week_start_date", weekStartDate);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to load goals." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    goals: ((data ?? []) as GoalRow[]).map((row) => ({
      id: row.id,
      employeeSlug: row.employee?.[0]?.slug,
      employeeName: row.employee?.[0]?.name,
      title: row.title,
      description: row.description,
      weekStartDate: row.week_start_date,
      dueDate: row.due_date,
      priority: row.priority,
      status: row.status,
      successMetric: row.success_metric,
      notes: row.notes,
      progressPercent: row.progress_percent,
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
  const parsed = createGoalSchema.safeParse(body);
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

  const weekStartDate =
    parsed.data.weekStartDate ?? startOfWeekIso(parsed.data.dueDate);
  const { data, error } = await supabase
    .from("ai_weekly_goals")
    .insert({
      employee_id: resolved.employeeRow.id,
      super_admin_user_id: access.userId,
      title: parsed.data.title,
      description: parsed.data.description,
      week_start_date: weekStartDate,
      due_date: parsed.data.dueDate,
      priority: parsed.data.priority,
      status: parsed.data.status,
      success_metric: parsed.data.successMetric,
      notes: parsed.data.notes,
      progress_percent: parsed.data.status === "completed" ? 100 : 0,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to create goal." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, goalId: data.id });
}

export async function PATCH(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = updateGoalSchema.safeParse(body);
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

  const patch: Record<string, unknown> = {};
  if (typeof parsed.data.title === "string") patch.title = parsed.data.title;
  if (typeof parsed.data.description === "string")
    patch.description = parsed.data.description;
  if (typeof parsed.data.weekStartDate === "string")
    patch.week_start_date = parsed.data.weekStartDate;
  if (typeof parsed.data.dueDate === "string")
    patch.due_date = parsed.data.dueDate;
  if (typeof parsed.data.priority === "string")
    patch.priority = parsed.data.priority;
  if (typeof parsed.data.status === "string") patch.status = parsed.data.status;
  if (typeof parsed.data.successMetric === "string")
    patch.success_metric = parsed.data.successMetric;
  if (typeof parsed.data.notes === "string") patch.notes = parsed.data.notes;
  if (typeof parsed.data.progressPercent === "number")
    patch.progress_percent = parsed.data.progressPercent;
  if (
    parsed.data.status === "completed" &&
    typeof patch.progress_percent !== "number"
  )
    patch.progress_percent = 100;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { success: false, message: "No updates provided." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("ai_weekly_goals")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("super_admin_user_id", access.userId);

  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to update goal." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { success: false, message: "Goal id is required." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("ai_weekly_goals")
    .delete()
    .eq("id", id)
    .eq("super_admin_user_id", access.userId);

  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to delete goal." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
