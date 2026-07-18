import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AI_EMPLOYEES } from "@/lib/ai-workforce/employees";
import {
  endOfWeekIso,
  ensureAccessAndUser,
  ensureRecurringAssignments,
  startOfWeekIso,
} from "@/lib/ai-workforce/management";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const querySchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const briefSchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

type EmployeeRef = Array<{ slug: string; name: string }> | null;

type GoalRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  employee: EmployeeRef;
};

type AssignmentRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  approval_required: boolean;
  assigned_at: string;
  completed_at: string | null;
  approved_at: string | null;
  updated_at: string;
  goal_id: string | null;
  employee: EmployeeRef;
};

type ProgressRow = {
  id: string;
  goal_id: string;
  status: string;
  progress_percent: number;
  work_completed: string;
  created_at: string;
};

type SavedContentRow = {
  id: string;
  title: string;
  created_at: string;
  employee: EmployeeRef;
};

type SummaryRow = {
  id: string;
  summary_markdown: string;
  created_at: string;
};

type HandoffRow = {
  id: string;
  status: string;
  summary: string;
  created_at: string;
  from_employee: EmployeeRef;
  to_employee: EmployeeRef;
};

type TimelineItem = {
  id: string;
  timestamp: string;
  title: string;
  type: string;
};

type EmployeeScorecard = {
  employeeSlug: string;
  employeeName: string;
  goalsCompleted: number;
  tasksCompleted: number;
  approvalRate: number;
  averageCompletionHours: number;
  currentWorkload: number;
  weeklyProductivity: number;
  qualityScore: number;
  lastActivity: string | null;
  trend: "up" | "flat" | "down";
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toPercent(part: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

function hoursBetween(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  return (end - start) / (1000 * 60 * 60);
}

function healthLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Healthy";
  if (score >= 50) return "Needs Attention";
  return "Critical";
}

function trendLabel(current: number, previous: number): "up" | "flat" | "down" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}

function generateExecutiveBrief(input: {
  weekStart: string;
  weekEnd: string;
  scorecards: EmployeeScorecard[];
  metrics: {
    goalsInProgress: number;
    completedThisWeek: number;
    pendingApprovals: number;
    overdueGoals: number;
    blockedTasks: number;
    weeklyProductivity: number;
  };
  alerts: string[];
  recommendations: string[];
}) {
  const topPerformer = [...input.scorecards].sort(
    (a, b) => b.weeklyProductivity - a.weeklyProductivity,
  )[0];

  const lagging = [...input.scorecards]
    .sort((a, b) => a.weeklyProductivity - b.weeklyProductivity)
    .slice(0, 2)
    .map((entry) => `${entry.employeeName} (${entry.weeklyProductivity}%)`);

  const executiveSummary = `Week ${input.weekStart} to ${input.weekEnd}: ${input.metrics.completedThisWeek} tasks were completed, ${input.metrics.goalsInProgress} goals remain in progress, and workforce productivity is ${input.metrics.weeklyProductivity}%.`;

  const biggestWins = [
    topPerformer
      ? `${topPerformer.employeeName} is leading with ${topPerformer.weeklyProductivity}% weekly productivity.`
      : "No clear top performer yet.",
    input.metrics.completedThisWeek > 0
      ? `${input.metrics.completedThisWeek} tasks were completed this week.`
      : "Task completion is low and needs focus.",
  ];

  const biggestRisks = [
    input.metrics.overdueGoals > 0
      ? `${input.metrics.overdueGoals} goals are overdue.`
      : "No overdue goals detected.",
    input.metrics.blockedTasks > 0
      ? `${input.metrics.blockedTasks} tasks are currently blocked.`
      : "No blocked tasks detected.",
    ...lagging.map((item) => `${item} is trending behind this week.`),
  ];

  const itemsAwaitingApproval =
    input.metrics.pendingApprovals > 0
      ? `${input.metrics.pendingApprovals} items are awaiting approval and may delay downstream execution.`
      : "No approval backlog at the moment.";

  const goalsBehindSchedule =
    input.metrics.overdueGoals > 0
      ? `${input.metrics.overdueGoals} goals require timeline recovery plans.`
      : "No goals currently behind schedule.";

  const recommendations = input.recommendations.slice(0, 5);
  const topPrioritiesTomorrow = [
    input.metrics.pendingApprovals > 0
      ? "Clear the approval queue to unblock execution."
      : "Maintain same-day approvals for AI output.",
    input.metrics.overdueGoals > 0
      ? "Re-scope overdue goals and assign explicit next actions."
      : "Advance in-progress goals by updating progress checkpoints.",
    "Assign focused high-priority work to employees with low current workload.",
  ];

  const sections = {
    executiveSummary,
    biggestWins,
    biggestRisks,
    itemsAwaitingApproval,
    goalsBehindSchedule,
    recommendations,
    topPrioritiesTomorrow,
  };

  const markdown = [
    "## Executive Summary",
    executiveSummary,
    "",
    "## Biggest Wins",
    ...biggestWins.map((item) => `- ${item}`),
    "",
    "## Biggest Risks",
    ...biggestRisks.map((item) => `- ${item}`),
    "",
    "## Items Awaiting Approval",
    itemsAwaitingApproval,
    "",
    "## Goals Behind Schedule",
    goalsBehindSchedule,
    "",
    "## Recommendations",
    ...recommendations.map((item) => `- ${item}`),
    "",
    "## Top Priorities Tomorrow",
    ...topPrioritiesTomorrow.map((item) => `- ${item}`),
  ].join("\n");

  return { sections, markdown };
}

async function buildCommandCenterData(userId: string, weekStartInput?: string) {
  const supabase = await createServerSupabaseClient();
  const weekStart = weekStartInput ?? startOfWeekIso();
  const weekEnd = endOfWeekIso(weekStart);
  const previousWeekStart = startOfWeekIso(
    new Date(
      new Date(`${weekStart}T00:00:00.000Z`).getTime() - 24 * 3600 * 1000,
    ),
  );
  const previousWeekEnd = endOfWeekIso(previousWeekStart);
  const today = new Date().toISOString().slice(0, 10);

  await ensureRecurringAssignments(supabase, userId, weekStart);

  const [
    goalsResult,
    tasksResult,
    progressResult,
    savedContentResult,
    summariesResult,
    handoffsResult,
  ] = await Promise.all([
    supabase
      .from("ai_weekly_goals")
      .select(
        "id,title,status,priority,due_date,created_at,updated_at,employee:ai_employees(slug,name)",
      )
      .eq("super_admin_user_id", userId)
      .order("due_date", { ascending: true }),
    supabase
      .from("ai_assignments")
      .select(
        "id,title,status,priority,due_date,approval_required,assigned_at,completed_at,approved_at,updated_at,goal_id,employee:ai_employees(slug,name)",
      )
      .eq("super_admin_user_id", userId)
      .order("due_date", { ascending: true }),
    supabase
      .from("ai_goal_progress_updates")
      .select("id,goal_id,status,progress_percent,work_completed,created_at")
      .eq("super_admin_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(400),
    supabase
      .from("ai_saved_content")
      .select("id,title,created_at,employee:ai_employees(slug,name)")
      .eq("super_admin_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ai_weekly_summaries")
      .select("id,summary_markdown,created_at")
      .eq("super_admin_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("ai_handoffs")
      .select(
        "id,status,summary,created_at,from_employee:ai_employees!ai_handoffs_from_employee_id_fkey(slug,name),to_employee:ai_employees!ai_handoffs_to_employee_id_fkey(slug,name)",
      )
      .eq("super_admin_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (
    goalsResult.error ||
    tasksResult.error ||
    progressResult.error ||
    savedContentResult.error ||
    summariesResult.error ||
    handoffsResult.error
  ) {
    return { error: true as const };
  }

  const goals = (goalsResult.data ?? []) as GoalRow[];
  const tasks = (tasksResult.data ?? []) as AssignmentRow[];
  const progressUpdates = (progressResult.data ?? []) as ProgressRow[];
  const savedContent = (savedContentResult.data ?? []) as SavedContentRow[];
  const summaries = (summariesResult.data ?? []) as SummaryRow[];
  const handoffs = (handoffsResult.data ?? []) as HandoffRow[];

  const openTaskStatuses = new Set([
    "assigned",
    "in_progress",
    "awaiting_approval",
    "approved",
    "blocked",
  ]);

  const activeEmployees = AI_EMPLOYEES.filter(
    (employee) => employee.status === "active",
  );

  const todayTasks = tasks.filter(
    (task) => task.due_date === today && openTaskStatuses.has(task.status),
  ).length;
  const goalsInProgress = goals.filter((goal) =>
    ["in_progress", "blocked"].includes(goal.status),
  ).length;
  const completedThisWeek = tasks.filter(
    (task) =>
      task.status === "completed" &&
      Boolean(task.completed_at) &&
      (task.completed_at ?? "") >= `${weekStart}T00:00:00.000Z`,
  ).length;
  const pendingApprovals = tasks.filter(
    (task) => task.status === "awaiting_approval",
  ).length;
  const overdueGoals = goals.filter(
    (goal) => goal.status !== "completed" && goal.due_date < today,
  ).length;
  const blockedTasks = tasks.filter((task) => task.status === "blocked").length;
  const highPriorityItems =
    goals.filter(
      (goal) =>
        ["high", "urgent"].includes(goal.priority) &&
        goal.status !== "completed",
    ).length +
    tasks.filter(
      (task) =>
        ["high", "urgent"].includes(task.priority) &&
        task.status !== "completed",
    ).length;

  const dueThisWeekRows = tasks.filter(
    (task) => task.due_date >= weekStart && task.due_date <= weekEnd,
  );
  const weeklyProductivity = toPercent(
    dueThisWeekRows.filter((task) => task.status === "completed").length,
    dueThisWeekRows.length,
  );

  const goalsThisWeek = goals.filter(
    (goal) => goal.due_date >= weekStart && goal.due_date <= weekEnd,
  );
  const goalsCompletedThisWeek = goalsThisWeek.filter(
    (goal) => goal.status === "completed",
  ).length;
  const goalCompletionScore = toPercent(
    goalsCompletedThisWeek,
    goalsThisWeek.length,
  );

  const overdueTasks = tasks.filter(
    (task) => openTaskStatuses.has(task.status) && task.due_date < today,
  ).length;
  const blockedGoals = goals.filter((goal) => goal.status === "blocked").length;

  const latestActivityByEmployee = new Map<string, string>();

  for (const item of tasks) {
    const slug = item.employee?.[0]?.slug;
    if (!slug) continue;
    const existing = latestActivityByEmployee.get(slug);
    if (!existing || existing < item.updated_at) {
      latestActivityByEmployee.set(slug, item.updated_at);
    }
  }

  for (const item of goals) {
    const slug = item.employee?.[0]?.slug;
    if (!slug) continue;
    const existing = latestActivityByEmployee.get(slug);
    if (!existing || existing < item.updated_at) {
      latestActivityByEmployee.set(slug, item.updated_at);
    }
  }

  for (const item of savedContent) {
    const slug = item.employee?.[0]?.slug;
    if (!slug) continue;
    const existing = latestActivityByEmployee.get(slug);
    if (!existing || existing < item.created_at) {
      latestActivityByEmployee.set(slug, item.created_at);
    }
  }

  const activeInLast3Days = activeEmployees.filter((employee) => {
    const iso = latestActivityByEmployee.get(employee.slug);
    if (!iso) return false;
    return new Date(iso).getTime() >= Date.now() - 3 * 24 * 3600 * 1000;
  }).length;

  const approvalFactor = clamp(100 - pendingApprovals * 8, 0, 100);
  const overdueFactor = clamp(100 - (overdueGoals + overdueTasks) * 6, 0, 100);
  const blockedFactor = clamp(100 - (blockedTasks + blockedGoals) * 8, 0, 100);
  const activityFactor = toPercent(activeInLast3Days, activeEmployees.length);

  const workforceHealthScore = clamp(
    Math.round(
      goalCompletionScore * 0.2 +
        weeklyProductivity * 0.3 +
        approvalFactor * 0.15 +
        overdueFactor * 0.15 +
        blockedFactor * 0.1 +
        activityFactor * 0.1,
    ),
    0,
    100,
  );

  const employeeScorecards: EmployeeScorecard[] = activeEmployees.map(
    (employee) => {
      const employeeGoals = goals.filter(
        (goal) => goal.employee?.[0]?.slug === employee.slug,
      );
      const employeeTasks = tasks.filter(
        (task) => task.employee?.[0]?.slug === employee.slug,
      );

      const goalsCompleted = employeeGoals.filter(
        (goal) => goal.status === "completed",
      ).length;
      const tasksCompleted = employeeTasks.filter(
        (task) => task.status === "completed",
      ).length;

      const approvalReady = employeeTasks.filter(
        (task) =>
          task.approval_required &&
          ["approved", "completed", "rejected"].includes(task.status),
      );
      const approvedItems = approvalReady.filter((task) =>
        ["approved", "completed"].includes(task.status),
      ).length;
      const approvalRate = toPercent(approvedItems, approvalReady.length);

      const completionDurations = employeeTasks
        .filter((task) => task.status === "completed" && task.completed_at)
        .map((task) =>
          hoursBetween(task.assigned_at, task.completed_at ?? task.assigned_at),
        )
        .filter((duration) => duration > 0);
      const averageCompletionHours =
        completionDurations.length > 0
          ? Number(
              (
                completionDurations.reduce((total, value) => total + value, 0) /
                completionDurations.length
              ).toFixed(1),
            )
          : 0;

      const currentWorkload = employeeTasks.filter((task) =>
        openTaskStatuses.has(task.status),
      ).length;
      const employeeDueThisWeek = employeeTasks.filter(
        (task) => task.due_date >= weekStart && task.due_date <= weekEnd,
      );
      const employeeCompletedThisWeek = employeeDueThisWeek.filter(
        (task) => task.status === "completed",
      ).length;
      const weeklyEmployeeProductivity = toPercent(
        employeeCompletedThisWeek,
        employeeDueThisWeek.length,
      );

      const qualityScore = clamp(
        Math.round(approvalRate * 0.6 + weeklyEmployeeProductivity * 0.4),
        0,
        100,
      );

      const previousWeekCompleted = employeeTasks.filter(
        (task) =>
          task.status === "completed" &&
          Boolean(task.completed_at) &&
          (task.completed_at ?? "") >= `${previousWeekStart}T00:00:00.000Z` &&
          (task.completed_at ?? "") <= `${previousWeekEnd}T23:59:59.999Z`,
      ).length;

      return {
        employeeSlug: employee.slug,
        employeeName: employee.name,
        goalsCompleted,
        tasksCompleted,
        approvalRate,
        averageCompletionHours,
        currentWorkload,
        weeklyProductivity: weeklyEmployeeProductivity,
        qualityScore,
        lastActivity: latestActivityByEmployee.get(employee.slug) ?? null,
        trend: trendLabel(employeeCompletedThisWeek, previousWeekCompleted),
      };
    },
  );

  const alerts: Array<{
    id: string;
    severity: "info" | "warning" | "critical";
    message: string;
  }> = [];

  for (const scorecard of employeeScorecards) {
    const employeeTasks = tasks.filter(
      (task) => task.employee?.[0]?.slug === scorecard.employeeSlug,
    );
    const employeeGoals = goals.filter(
      (goal) => goal.employee?.[0]?.slug === scorecard.employeeSlug,
    );

    const employeeOverdueTasks = employeeTasks.filter(
      (task) => openTaskStatuses.has(task.status) && task.due_date < today,
    ).length;
    const employeePendingApprovals = employeeTasks.filter(
      (task) => task.status === "awaiting_approval",
    ).length;
    const employeeBlocked =
      employeeTasks.filter((task) => task.status === "blocked").length +
      employeeGoals.filter((goal) => goal.status === "blocked").length;

    if (scorecard.currentWorkload === 0) {
      alerts.push({
        id: `no-work-${scorecard.employeeSlug}`,
        severity: "info",
        message: `${scorecard.employeeName} has no assigned work.`,
      });
    }

    if (employeeOverdueTasks > 0) {
      alerts.push({
        id: `overdue-${scorecard.employeeSlug}`,
        severity: "warning",
        message: `${scorecard.employeeName} has overdue tasks.`,
      });
    }

    if (employeePendingApprovals > 0) {
      alerts.push({
        id: `pending-${scorecard.employeeSlug}`,
        severity: "warning",
        message: `${scorecard.employeeName} has pending approvals.`,
      });
    }

    if (employeeBlocked > 0) {
      alerts.push({
        id: `blocked-${scorecard.employeeSlug}`,
        severity: "critical",
        message: `${scorecard.employeeName} has blocked work.`,
      });
    }

    if (
      scorecard.currentWorkload === 0 &&
      employeeTasks.some((task) => task.status === "completed")
    ) {
      alerts.push({
        id: `done-${scorecard.employeeSlug}`,
        severity: "info",
        message: `${scorecard.employeeName} has completed all current work.`,
      });
    }
  }

  const recommendations = Array.from(
    new Set(
      alerts.map((alert) => {
        if (alert.message.includes("no assigned work")) {
          return "Assign more work to available employees to avoid idle capacity.";
        }
        if (alert.message.includes("overdue tasks")) {
          return "Reduce overdue load by re-prioritizing deadlines and assigning ownership today.";
        }
        if (alert.message.includes("pending approvals")) {
          return "Clear approval backlog early to keep execution moving.";
        }
        if (alert.message.includes("blocked work")) {
          return "Unblock operational dependencies and define a single next action for each blocker.";
        }
        return "Maintain consistent weekly planning and approval cadence.";
      }),
    ),
  );

  const timeline: TimelineItem[] = [];

  for (const task of tasks) {
    const employeeName = task.employee?.[0]?.name ?? "AI employee";
    if (task.completed_at) {
      timeline.push({
        id: `task-completed-${task.id}`,
        timestamp: task.completed_at,
        title: `${employeeName} completed task: ${task.title}`,
        type: "task_completed",
      });
    }

    if (task.approved_at) {
      timeline.push({
        id: `approval-${task.id}`,
        timestamp: task.approved_at,
        title: `Approval granted: ${task.title}`,
        type: "approval",
      });
    }
  }

  for (const progress of progressUpdates) {
    timeline.push({
      id: `goal-progress-${progress.id}`,
      timestamp: progress.created_at,
      title: `Goal updated to ${progress.progress_percent}% (${progress.status.replaceAll("_", " ")})`,
      type: "goal_update",
    });
  }

  for (const goal of goals) {
    const employeeName = goal.employee?.[0]?.name ?? "AI employee";
    timeline.push({
      id: `goal-created-${goal.id}`,
      timestamp: goal.created_at,
      title: `${employeeName} goal created: ${goal.title}`,
      type: "goal_created",
    });
  }

  for (const content of savedContent) {
    const employeeName = content.employee?.[0]?.name ?? "AI employee";
    timeline.push({
      id: `content-${content.id}`,
      timestamp: content.created_at,
      title: `${employeeName} generated content: ${content.title}`,
      type: "content_generated",
    });
  }

  for (const summary of summaries) {
    timeline.push({
      id: `summary-${summary.id}`,
      timestamp: summary.created_at,
      title: "Weekly summary generated",
      type: "summary_generated",
    });
  }

  for (const handoff of handoffs) {
    const from = handoff.from_employee?.[0]?.name ?? "AI employee";
    const to = handoff.to_employee?.[0]?.name ?? "AI employee";
    timeline.push({
      id: `handoff-${handoff.id}`,
      timestamp: handoff.created_at,
      title: `Handoff ${from} -> ${to}: ${handoff.summary}`,
      type: "handoff",
    });
  }

  timeline.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  const health = {
    score: workforceHealthScore,
    label: healthLabel(workforceHealthScore),
    explanation:
      workforceHealthScore >= 85
        ? "Execution is strong across goals, approvals, and task throughput."
        : workforceHealthScore >= 70
          ? "Performance is stable, but one or two bottlenecks should be resolved quickly."
          : workforceHealthScore >= 50
            ? "Multiple workflow bottlenecks are reducing output and need active intervention."
            : "Critical execution risk detected; immediate prioritization and re-allocation is required.",
    factors: {
      goalCompletion: goalCompletionScore,
      taskCompletion: weeklyProductivity,
      approvalBacklog: approvalFactor,
      overdueWork: overdueFactor,
      blockedWork: blockedFactor,
      employeeActivity: activityFactor,
    },
  };

  const ceoMode = {
    whatHappenedYesterday: timeline
      .filter(
        (item) => +new Date(item.timestamp) >= Date.now() - 24 * 3600 * 1000,
      )
      .slice(0, 4)
      .map((item) => item.title),
    attentionToday: alerts.slice(0, 4).map((alert) => alert.message),
    workNext:
      recommendations[0] ??
      "Review high-priority items and set owner + due date for each.",
    whoNeedsHelp: employeeScorecards
      .filter(
        (entry) => entry.weeklyProductivity < 50 || entry.currentWorkload === 0,
      )
      .map((entry) => entry.employeeName)
      .slice(0, 4),
    aiEmployeesNext: recommendations.slice(0, 4),
  };

  return {
    error: false as const,
    data: {
      weekStart,
      weekEnd,
      metrics: {
        todayTasks,
        goalsInProgress,
        completedThisWeek,
        pendingApprovals,
        overdueGoals,
        blockedTasks,
        highPriorityItems,
        workforceHealthScore,
        weeklyProductivity,
      },
      health,
      employeeScorecards,
      alerts,
      recommendations,
      timeline: timeline.slice(0, 60),
      latestWeeklySummary: summaries[0] ?? null,
      ceoMode,
    },
  };
}

export async function GET(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const parsed = querySchema.safeParse({
    weekStart: request.nextUrl.searchParams.get("weekStart") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid query." },
      { status: 400 },
    );
  }

  const payload = await buildCommandCenterData(
    access.userId,
    parsed.data.weekStart,
  );
  if (payload.error) {
    return NextResponse.json(
      { success: false, message: "Unable to load command center." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, ...payload.data });
}

export async function POST(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = briefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 },
    );
  }

  const payload = await buildCommandCenterData(
    access.userId,
    parsed.data.weekStart,
  );
  if (payload.error) {
    return NextResponse.json(
      { success: false, message: "Unable to generate executive brief." },
      { status: 500 },
    );
  }

  const brief = generateExecutiveBrief({
    weekStart: payload.data.weekStart,
    weekEnd: payload.data.weekEnd,
    scorecards: payload.data.employeeScorecards,
    metrics: {
      goalsInProgress: payload.data.metrics.goalsInProgress,
      completedThisWeek: payload.data.metrics.completedThisWeek,
      pendingApprovals: payload.data.metrics.pendingApprovals,
      overdueGoals: payload.data.metrics.overdueGoals,
      blockedTasks: payload.data.metrics.blockedTasks,
      weeklyProductivity: payload.data.metrics.weeklyProductivity,
    },
    alerts: payload.data.alerts.map((alert) => alert.message),
    recommendations: payload.data.recommendations,
  });

  return NextResponse.json({ success: true, brief });
}
