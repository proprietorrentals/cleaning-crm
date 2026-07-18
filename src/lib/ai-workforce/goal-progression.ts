import type { SupabaseClient } from "@supabase/supabase-js";

type GoalStateRow = {
  id: string;
  status: "not_started" | "in_progress" | "blocked" | "completed";
  progress_percent: number;
  completed_at: string | null;
};

type AssignmentStatusRow = {
  status: string;
};

export type GoalProgressSyncResult = {
  goalId: string;
  progressPercent: number;
  completedTaskCount: number;
  totalTaskCount: number;
  status: "not_started" | "in_progress" | "blocked" | "completed";
  suggestedCompletion: boolean;
  updated: boolean;
};

function toPercent(completedCount: number, totalCount: number) {
  if (totalCount <= 0) {
    return 0;
  }
  return Math.round((completedCount / totalCount) * 100);
}

function deriveGoalStatus(params: {
  currentStatus: GoalStateRow["status"];
  nextProgress: number;
}) {
  const { currentStatus, nextProgress } = params;

  if (currentStatus === "completed" && nextProgress < 100) {
    return "in_progress";
  }

  if (currentStatus === "not_started" && nextProgress > 0) {
    return "in_progress";
  }

  return currentStatus;
}

export async function syncGoalProgressFromAssignments(params: {
  supabase: SupabaseClient;
  userId: string;
  goalId: string;
  completionNote: string;
  nextAction?: string;
}) {
  const { supabase, userId, goalId, completionNote, nextAction } = params;

  const [
    { data: goalRow, error: goalError },
    { data: tasksRows, error: tasksError },
  ] = await Promise.all([
    supabase
      .from("ai_weekly_goals")
      .select("id,status,progress_percent,completed_at")
      .eq("id", goalId)
      .eq("super_admin_user_id", userId)
      .single(),
    supabase
      .from("ai_assignments")
      .select("status")
      .eq("goal_id", goalId)
      .eq("super_admin_user_id", userId),
  ]);

  if (goalError || !goalRow || tasksError) {
    return { error: true as const };
  }

  const assignmentRows = (tasksRows ?? []) as AssignmentStatusRow[];
  const totalTaskCount = assignmentRows.length;
  const completedTaskCount = assignmentRows.filter(
    (row) => row.status === "completed",
  ).length;
  const nextProgress = toPercent(completedTaskCount, totalTaskCount);

  const currentStatus = goalRow.status as GoalStateRow["status"];
  const nextStatus = deriveGoalStatus({
    currentStatus,
    nextProgress,
  });
  const suggestedCompletion =
    nextStatus !== "completed" &&
    totalTaskCount > 0 &&
    completedTaskCount === totalTaskCount;

  const patch: Record<string, unknown> = {};
  if (goalRow.progress_percent !== nextProgress) {
    patch.progress_percent = nextProgress;
  }

  if (currentStatus !== nextStatus) {
    patch.status = nextStatus;
  }

  if (
    typeof goalRow.completed_at === "string" &&
    goalRow.completed_at.length > 0 &&
    nextStatus !== "completed"
  ) {
    patch.completed_at = null;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("ai_weekly_goals")
      .update(patch)
      .eq("id", goalId)
      .eq("super_admin_user_id", userId);

    if (error) {
      return { error: true as const };
    }
  }

  const { error: historyError } = await supabase
    .from("ai_goal_progress_updates")
    .insert({
      goal_id: goalId,
      super_admin_user_id: userId,
      status: nextStatus,
      progress_percent: nextProgress,
      work_completed: completionNote,
      blocker_notes: "",
      next_action:
        nextAction ??
        (suggestedCompletion
          ? "All related tasks are complete. Review and confirm goal completion."
          : "Continue executing remaining related tasks."),
    });

  if (historyError) {
    return { error: true as const };
  }

  return {
    error: false as const,
    data: {
      goalId,
      progressPercent: nextProgress,
      completedTaskCount,
      totalTaskCount,
      status: nextStatus,
      suggestedCompletion,
      updated: Object.keys(patch).length > 0,
    } satisfies GoalProgressSyncResult,
  };
}
