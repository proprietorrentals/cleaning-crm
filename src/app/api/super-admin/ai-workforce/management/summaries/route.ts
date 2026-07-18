import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  endOfWeekIso,
  ensureAccessAndUser,
  ensureRecurringAssignments,
  startOfWeekIso,
} from "@/lib/ai-workforce/management";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const generateSummarySchema = z.object({
  weekStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

type WeeklySummaryRow = {
  id: string;
  week_start_date: string;
  week_end_date: string;
  summary_markdown: string;
  generated_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type GoalSummaryRow = {
  title: string;
  status: string;
  priority: string;
  employee: Array<{ name: string }> | null;
};

type AssignmentSummaryRow = {
  title: string;
  status: string;
  priority: string;
  employee: Array<{ name: string }> | null;
};

type HandoffSummaryRow = {
  summary: string;
  status: string;
  from_employee: Array<{ name: string }> | null;
  to_employee: Array<{ name: string }> | null;
};

function toList(items: string[]) {
  if (items.length === 0) return "- None";
  return items.map((item) => `- ${item}`).join("\n");
}

export async function GET(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const supabase = await createServerSupabaseClient();
  const userId = access.userId;

  const weekStart = request.nextUrl.searchParams.get("weekStartDate");
  let query = supabase
    .from("ai_weekly_summaries")
    .select(
      "id,week_start_date,week_end_date,summary_markdown,generated_data,created_at,updated_at",
    )
    .eq("super_admin_user_id", userId)
    .order("week_start_date", { ascending: false })
    .limit(20);

  if (weekStart) {
    query = query.eq("week_start_date", weekStart);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to load weekly summaries." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    summaries: ((data ?? []) as WeeklySummaryRow[]).map((row) => ({
      id: row.id,
      weekStartDate: row.week_start_date,
      weekEndDate: row.week_end_date,
      summaryMarkdown: row.summary_markdown,
      generatedData: row.generated_data ?? {},
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
  const parsed = generateSummarySchema.safeParse(body);
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
  const userId = access.userId;

  const weekStartDate = parsed.data.weekStartDate ?? startOfWeekIso();
  const weekEndDate = endOfWeekIso(weekStartDate);

  await ensureRecurringAssignments(supabase, userId, weekStartDate);

  const [goalsResult, assignmentsResult, handoffsResult] = await Promise.all([
    supabase
      .from("ai_weekly_goals")
      .select("title,status,priority,employee:ai_employees(name)")
      .eq("super_admin_user_id", userId)
      .eq("week_start_date", weekStartDate),
    supabase
      .from("ai_assignments")
      .select("title,status,priority,employee:ai_employees(name)")
      .eq("super_admin_user_id", userId)
      .gte("due_date", weekStartDate)
      .lte("due_date", weekEndDate),
    supabase
      .from("ai_handoffs")
      .select(
        "summary,status,from_employee:ai_employees!ai_handoffs_from_employee_id_fkey(name),to_employee:ai_employees!ai_handoffs_to_employee_id_fkey(name)",
      )
      .eq("super_admin_user_id", userId)
      .gte("created_at", `${weekStartDate}T00:00:00.000Z`)
      .lte("created_at", `${weekEndDate}T23:59:59.999Z`),
  ]);

  if (goalsResult.error || assignmentsResult.error || handoffsResult.error) {
    return NextResponse.json(
      { success: false, message: "Unable to generate weekly summary." },
      { status: 500 },
    );
  }

  const goals = (goalsResult.data ?? []) as GoalSummaryRow[];
  const assignments = (assignmentsResult.data ?? []) as AssignmentSummaryRow[];
  const handoffs = (handoffsResult.data ?? []) as HandoffSummaryRow[];

  const completedGoals = goals.filter((goal) => goal.status === "completed");
  const blockedGoals = goals.filter((goal) => goal.status === "blocked");
  const completedAssignments = assignments.filter(
    (task) => task.status === "completed",
  );
  const awaitingApproval = assignments.filter(
    (task) => task.status === "awaiting_approval",
  );
  const overdue = assignments.filter((task) =>
    [
      "assigned",
      "in_progress",
      "awaiting_approval",
      "approved",
      "blocked",
    ].includes(task.status),
  );

  const summaryMarkdown = [
    `# AI Workforce Weekly Summary (${weekStartDate} to ${weekEndDate})`,
    "",
    `## Highlights`,
    `- Completed goals: ${completedGoals.length}`,
    `- Completed assignments: ${completedAssignments.length}`,
    `- Awaiting approval: ${awaitingApproval.length}`,
    `- Blocked or at risk: ${blockedGoals.length + overdue.length}`,
    "",
    "## Completed Goals",
    toList(
      completedGoals.map(
        (goal) =>
          `${goal.employee?.[0]?.name ?? "Unknown employee"}: ${goal.title}`,
      ),
    ),
    "",
    "## Blocked Goals",
    toList(
      blockedGoals.map(
        (goal) =>
          `${goal.employee?.[0]?.name ?? "Unknown employee"}: ${goal.title}`,
      ),
    ),
    "",
    "## Awaiting Approval",
    toList(
      awaitingApproval.map(
        (task) =>
          `${task.employee?.[0]?.name ?? "Unknown employee"}: ${task.title}`,
      ),
    ),
    "",
    "## Cross-Employee Handoffs",
    toList(
      handoffs.map(
        (handoff) =>
          `${handoff.from_employee?.[0]?.name ?? "Unknown"} -> ${handoff.to_employee?.[0]?.name ?? "Unknown"}: ${handoff.summary}`,
      ),
    ),
  ].join("\n");

  const generatedData = {
    goalsTotal: goals.length,
    assignmentsTotal: assignments.length,
    handoffsTotal: handoffs.length,
    completedGoals: completedGoals.length,
    completedAssignments: completedAssignments.length,
    awaitingApproval: awaitingApproval.length,
    blockedGoals: blockedGoals.length,
    overdueTasks: overdue.length,
  };

  const { data, error } = await supabase
    .from("ai_weekly_summaries")
    .upsert(
      {
        super_admin_user_id: userId,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        summary_markdown: summaryMarkdown,
        generated_data: generatedData,
      },
      {
        onConflict: "super_admin_user_id,week_start_date,week_end_date",
        ignoreDuplicates: false,
      },
    )
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to save weekly summary." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    summaryId: data.id,
    summaryMarkdown,
    generatedData,
    weekStartDate,
    weekEndDate,
  });
}
