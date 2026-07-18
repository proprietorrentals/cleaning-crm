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

const updateGoalSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(4000).optional(),
  weekStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  priority: z.enum(AI_GOAL_PRIORITIES).optional(),
  status: z.enum(AI_GOAL_STATUSES).optional(),
  successMetric: z.string().max(500).optional(),
  notes: z.string().max(4000).optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  workCompleted: z.string().max(8000).optional(),
  blockerNotes: z.string().max(4000).optional(),
  nextAction: z.string().max(2000).optional(),
  markComplete: z.boolean().optional(),
  recordHistory: z.boolean().optional(),
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
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  employee: Array<{ slug: string; name: string }> | null;
};

type GoalProgressRow = {
  id: string;
  goal_id: string;
  status: (typeof AI_GOAL_STATUSES)[number];
  progress_percent: number;
  work_completed: string;
  blocker_notes: string;
  next_action: string;
  created_at: string;
  updated_at: string;
};

type AssignmentGoalRow = {
  goal_id: string | null;
  status: string;
};

function toHistoryItem(row: GoalProgressRow) {
  return {
    id: row.id,
    goalId: row.goal_id,
    status: row.status,
    progressPercent: row.progress_percent,
    workCompleted: row.work_completed,
    blockerNotes: row.blocker_notes,
    nextAction: row.next_action,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
      "id,title,description,week_start_date,due_date,priority,status,success_metric,notes,progress_percent,completed_at,created_at,updated_at,employee:ai_employees(slug,name)",
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

  const rows = (data ?? []) as GoalRow[];
  const goalIds = rows.map((row) => row.id);

  const taskCountByGoalId = new Map<
    string,
    { total: number; completed: number }
  >();
  const historyByGoalId = new Map<string, ReturnType<typeof toHistoryItem>[]>();

  if (goalIds.length > 0) {
    const [assignmentsResult, historyResult] = await Promise.all([
      supabase
        .from("ai_assignments")
        .select("goal_id,status")
        .eq("super_admin_user_id", userId)
        .in("goal_id", goalIds),
      supabase
        .from("ai_goal_progress_updates")
        .select(
          "id,goal_id,status,progress_percent,work_completed,blocker_notes,next_action,created_at,updated_at",
        )
        .eq("super_admin_user_id", userId)
        .in("goal_id", goalIds)
        .order("created_at", { ascending: false }),
    ]);

    if (assignmentsResult.error || historyResult.error) {
      return NextResponse.json(
        { success: false, message: "Unable to load goals." },
        { status: 500 },
      );
    }

    for (const assignment of (assignmentsResult.data ??
      []) as AssignmentGoalRow[]) {
      if (!assignment.goal_id) continue;
      const current = taskCountByGoalId.get(assignment.goal_id) ?? {
        total: 0,
        completed: 0,
      };
      current.total += 1;
      if (assignment.status === "completed") {
        current.completed += 1;
      }
      taskCountByGoalId.set(assignment.goal_id, current);
    }

    for (const entry of (historyResult.data ?? []) as GoalProgressRow[]) {
      const current = historyByGoalId.get(entry.goal_id) ?? [];
      current.push(toHistoryItem(entry));
      historyByGoalId.set(entry.goal_id, current);
    }
  }

  return NextResponse.json({
    success: true,
    goals: rows.map((row) => {
      const taskCounts = taskCountByGoalId.get(row.id) ?? {
        total: 0,
        completed: 0,
      };
      const history = historyByGoalId.get(row.id) ?? [];
      const latestHistory = history[0] ?? null;
      const suggestedCompletion =
        row.status !== "completed" &&
        taskCounts.total > 0 &&
        taskCounts.completed === taskCounts.total;

      return {
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
        completedAt: row.completed_at,
        latestProgressUpdate: latestHistory?.workCompleted ?? "",
        lastProgressUpdatedAt: latestHistory?.createdAt ?? null,
        relatedTaskCompletedCount: taskCounts.completed,
        relatedTaskTotalCount: taskCounts.total,
        suggestedCompletion,
        progressHistory: history,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }),
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
  const shouldStartCompleted = parsed.data.status === "completed";
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
      progress_percent: shouldStartCompleted ? 100 : 0,
      completed_at: shouldStartCompleted ? new Date().toISOString() : null,
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

  const supabase = await createServerSupabaseClient();
  const { data: existingGoal, error: existingGoalError } = await supabase
    .from("ai_weekly_goals")
    .select("id,status,progress_percent,completed_at")
    .eq("id", parsed.data.id)
    .eq("super_admin_user_id", access.userId)
    .single();

  if (existingGoalError || !existingGoal) {
    return NextResponse.json(
      { success: false, message: "Unable to find goal." },
      { status: 404 },
    );
  }

  const existingStatus =
    existingGoal.status as (typeof AI_GOAL_STATUSES)[number];
  const existingProgress = existingGoal.progress_percent as number;

  let nextStatus =
    parsed.data.status ?? (existingStatus as (typeof AI_GOAL_STATUSES)[number]);
  let nextProgress =
    typeof parsed.data.progressPercent === "number"
      ? parsed.data.progressPercent
      : existingProgress;

  if (parsed.data.markComplete) {
    nextStatus = "completed";
    nextProgress = 100;
  }

  if (
    parsed.data.status === "completed" &&
    typeof parsed.data.progressPercent !== "number"
  ) {
    nextProgress = 100;
  }

  if (nextStatus === "completed" && nextProgress < 100) {
    nextStatus = "in_progress";
  }

  let nextCompletedAt: string | null =
    typeof existingGoal.completed_at === "string"
      ? existingGoal.completed_at
      : null;
  if (nextStatus === "completed") {
    if (existingStatus !== "completed" || !nextCompletedAt) {
      nextCompletedAt = new Date().toISOString();
    }
  } else {
    nextCompletedAt = null;
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
  if (nextStatus !== existingStatus) patch.status = nextStatus;
  if (typeof parsed.data.successMetric === "string")
    patch.success_metric = parsed.data.successMetric;
  if (typeof parsed.data.notes === "string") patch.notes = parsed.data.notes;
  if (nextProgress !== existingProgress) patch.progress_percent = nextProgress;
  if (nextCompletedAt !== existingGoal.completed_at) {
    patch.completed_at = nextCompletedAt;
  }

  const workCompleted = parsed.data.workCompleted?.trim() ?? "";
  const blockerNotes = parsed.data.blockerNotes?.trim() ?? "";
  const nextAction = parsed.data.nextAction?.trim() ?? "";
  const shouldRecordHistory = parsed.data.recordHistory ?? true;
  const hasNarrative =
    workCompleted.length > 0 ||
    blockerNotes.length > 0 ||
    nextAction.length > 0;
  const hasStatusOrProgressChange =
    nextStatus !== existingStatus || nextProgress !== existingProgress;

  if (
    Object.keys(patch).length === 0 &&
    !(shouldRecordHistory && (hasNarrative || hasStatusOrProgressChange))
  ) {
    return NextResponse.json(
      { success: false, message: "No updates provided." },
      { status: 400 },
    );
  }

  if (Object.keys(patch).length > 0) {
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
  }

  if (shouldRecordHistory && (hasNarrative || hasStatusOrProgressChange)) {
    const { error } = await supabase.from("ai_goal_progress_updates").insert({
      goal_id: parsed.data.id,
      super_admin_user_id: access.userId,
      status: nextStatus,
      progress_percent: nextProgress,
      work_completed: workCompleted,
      blocker_notes: blockerNotes,
      next_action: nextAction,
    });

    if (error) {
      return NextResponse.json(
        { success: false, message: "Unable to save goal progress history." },
        { status: 500 },
      );
    }
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
