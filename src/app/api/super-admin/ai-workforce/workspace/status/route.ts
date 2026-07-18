import { z } from "zod";
import { resolveAiEmployee } from "@/lib/ai-workforce/resolve-employee";
import { AI_WORKFORCE_STATUSES } from "@/lib/ai-workforce/workspace-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const bodySchema = z.object({
  contentId: z.string().uuid(),
  employeeSlug: z.string().min(1),
  status: z.enum(AI_WORKFORCE_STATUSES),
});

type TransitionRow = {
  content_id: string;
  task_id: string;
  status: string;
  approved_at: string | null;
  completed_at: string | null;
  duplicate_prevented: boolean;
  history_length: number;
  action: string;
};

export async function PATCH(request: Request) {
  const access = await requireSuperAdminAccess();

  if (access.needsAuth) {
    return Response.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  if (access.denied) {
    return Response.json(
      { success: false, message: "Super Admin access required." },
      { status: 403 },
    );
  }

  if (access.rpcError) {
    return Response.json(
      { success: false, message: "Unable to verify Super Admin access." },
      { status: 503 },
    );
  }

  const userId = access.user?.id;
  if (!userId) {
    return Response.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(body);

  if (!parsedBody.success) {
    return Response.json(
      { success: false, message: "Invalid approval mutation payload." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();

  const { employeeRow, errorMessage } = await resolveAiEmployee(
    supabase,
    parsedBody.data.employeeSlug,
  );

  if (!employeeRow || errorMessage) {
    return Response.json(
      { success: false, message: errorMessage ?? "Unknown AI employee." },
      { status: 404 },
    );
  }

  const { data: transitionRows, error: transitionError } = await supabase.rpc(
    "ai_workforce_transition_status",
    {
      p_content_id: parsedBody.data.contentId,
      p_employee_slug: parsedBody.data.employeeSlug,
      p_target_status: parsedBody.data.status,
    },
  );

  if (transitionError) {
    const message =
      transitionError.message ?? "Unable to persist linked task state.";
    const statusCode = message.includes("Saved content not found")
      ? 404
      : message.includes("Unknown AI employee")
        ? 404
        : message.includes("Authentication required")
          ? 401
          : message.includes("Super Admin access required")
            ? 403
            : message.includes("Linked task integrity failure")
              ? 409
              : 503;
    return Response.json({ success: false, message }, { status: statusCode });
  }

  const transitionRow = ((transitionRows as TransitionRow[] | null) ?? [])[0];
  if (!transitionRow) {
    return Response.json(
      { success: false, message: "Unable to persist linked task state." },
      { status: 503 },
    );
  }

  return Response.json({
    success: true,
    data: {
      status: transitionRow.status,
      duplicatePrevented: transitionRow.duplicate_prevented,
      approvedAt: transitionRow.approved_at,
      completedAt: transitionRow.completed_at,
      taskId: transitionRow.task_id,
      action: transitionRow.action,
      historyLength: transitionRow.history_length,
    },
  });
}
