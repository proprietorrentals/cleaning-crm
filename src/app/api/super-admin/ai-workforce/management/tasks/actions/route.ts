import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { syncGoalProgressFromAssignments } from "@/lib/ai-workforce/goal-progression";
import { ensureAccessAndUser } from "@/lib/ai-workforce/management";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum([
    "start",
    "submit",
    "approve",
    "reject",
    "complete",
    "reassign",
  ]),
  feedback: z.string().max(2000).optional(),
  blockedReason: z.string().max(2000).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function POST(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
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

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};

  const supabase = await createServerSupabaseClient();
  const { data: assignmentRow, error: assignmentError } = await supabase
    .from("ai_assignments")
    .select(
      "id,title,status,approval_required,goal_id,employee:ai_employees(name)",
    )
    .eq("id", parsed.data.id)
    .eq("super_admin_user_id", access.userId)
    .single();

  if (assignmentError || !assignmentRow) {
    return NextResponse.json(
      { success: false, message: "Assignment not found." },
      { status: 404 },
    );
  }

  if (parsed.data.action === "start") {
    patch.status = "in_progress";
    patch.started_at = now;
  } else if (parsed.data.action === "submit") {
    patch.status = "awaiting_approval";
    patch.submitted_at = now;
    patch.blocked_reason = null;
  } else if (parsed.data.action === "approve") {
    patch.status = "approved";
    patch.approved_at = now;
    patch.rejection_feedback = null;
  } else if (parsed.data.action === "reject") {
    patch.status = "rejected";
    patch.rejection_feedback = parsed.data.feedback ?? "Needs revision";
  } else if (parsed.data.action === "complete") {
    if (
      assignmentRow.approval_required &&
      !["approved", "completed"].includes(assignmentRow.status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This task requires approval before completion.",
        },
        { status: 400 },
      );
    }

    patch.status = "completed";
    patch.completed_at = now;
  } else if (parsed.data.action === "reassign") {
    patch.status = "assigned";
    patch.due_date =
      parsed.data.dueDate ??
      new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 10);
    patch.blocked_reason = parsed.data.blockedReason ?? null;
  }
  const { error } = await supabase
    .from("ai_assignments")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("super_admin_user_id", access.userId);

  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to update assignment." },
      { status: 500 },
    );
  }

  let goalSyncResult: {
    goalId: string;
    progressPercent: number;
    completedTaskCount: number;
    totalTaskCount: number;
    status: "not_started" | "in_progress" | "blocked" | "completed";
    suggestedCompletion: boolean;
    updated: boolean;
  } | null = null;

  if (
    typeof assignmentRow.goal_id === "string" &&
    ["complete", "reassign"].includes(parsed.data.action)
  ) {
    const employeeName = assignmentRow.employee?.[0]?.name ?? "AI employee";
    const completionNote =
      parsed.data.action === "complete"
        ? `${employeeName} completed task: ${assignmentRow.title}`
        : `Task was reassigned or reopened: ${assignmentRow.title}`;

    const syncResult = await syncGoalProgressFromAssignments({
      supabase,
      userId: access.userId,
      goalId: assignmentRow.goal_id,
      completionNote,
    });

    if (syncResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: "Task updated, but automatic goal progression failed.",
        },
        { status: 500 },
      );
    }

    goalSyncResult = syncResult.data;
  }

  return NextResponse.json({
    success: true,
    goalProgression: goalSyncResult,
  });
}
