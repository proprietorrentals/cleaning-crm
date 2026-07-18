import { type NextRequest, NextResponse } from "next/server";
import { AI_EMPLOYEES } from "@/lib/ai-workforce/employees";
import {
  ensureAccessAndUser,
  ensureRecurringAssignments,
  startOfWeekIso,
} from "@/lib/ai-workforce/management";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const userId = access.userId;
    const weekStart =
      request.nextUrl.searchParams.get("weekStart") ?? startOfWeekIso();

    await ensureRecurringAssignments(supabase, userId, weekStart);

    const [
      goalsInProgress,
      dueThisWeek,
      awaitingApproval,
      completedThisWeek,
      overdueTasks,
      inScopeTaskCounts,
    ] = await Promise.all([
      supabase
        .from("ai_weekly_goals")
        .select("id", { count: "exact", head: true })
        .eq("super_admin_user_id", userId)
        .in("status", ["in_progress", "blocked"]),
      supabase
        .from("ai_assignments")
        .select("id", { count: "exact", head: true })
        .eq("super_admin_user_id", userId)
        .gte("due_date", weekStart)
        .lte(
          "due_date",
          new Date(
            new Date(`${weekStart}T00:00:00.000Z`).getTime() +
              6 * 24 * 3600 * 1000,
          )
            .toISOString()
            .slice(0, 10),
        ),
      supabase
        .from("ai_assignments")
        .select("id", { count: "exact", head: true })
        .eq("super_admin_user_id", userId)
        .eq("status", "awaiting_approval"),
      supabase
        .from("ai_assignments")
        .select("id", { count: "exact", head: true })
        .eq("super_admin_user_id", userId)
        .eq("status", "completed")
        .gte("completed_at", `${weekStart}T00:00:00.000Z`),
      supabase
        .from("ai_assignments")
        .select("id", { count: "exact", head: true })
        .eq("super_admin_user_id", userId)
        .in("status", [
          "assigned",
          "in_progress",
          "awaiting_approval",
          "approved",
          "blocked",
        ])
        .lt("due_date", new Date().toISOString().slice(0, 10)),
      supabase
        .from("ai_assignments")
        .select("status", { count: "exact" })
        .eq("super_admin_user_id", userId)
        .gte("due_date", weekStart)
        .lte(
          "due_date",
          new Date(
            new Date(`${weekStart}T00:00:00.000Z`).getTime() +
              6 * 24 * 3600 * 1000,
          )
            .toISOString()
            .slice(0, 10),
        ),
    ]);

    if (
      goalsInProgress.error ||
      dueThisWeek.error ||
      awaitingApproval.error ||
      completedThisWeek.error ||
      overdueTasks.error ||
      inScopeTaskCounts.error
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to load dashboard metrics.",
        },
        { status: 500 },
      );
    }

    const totalThisWeek = inScopeTaskCounts.data?.length ?? 0;
    const completedInScope = (inScopeTaskCounts.data ?? []).filter(
      (row) => row.status === "completed",
    ).length;

    return NextResponse.json({
      success: true,
      metrics: {
        totalActiveEmployees: AI_EMPLOYEES.filter(
          (employee) => employee.status === "active",
        ).length,
        goalsInProgress: goalsInProgress.count ?? 0,
        tasksDueThisWeek: dueThisWeek.count ?? 0,
        awaitingApproval: awaitingApproval.count ?? 0,
        completedThisWeek: completedThisWeek.count ?? 0,
        overdueTasks: overdueTasks.count ?? 0,
        weeklyCompletionPercentage:
          totalThisWeek > 0
            ? Math.round((completedInScope / totalThisWeek) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Failed to load AI workforce dashboard metrics", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load dashboard metrics.",
      },
      { status: 500 },
    );
  }
}
