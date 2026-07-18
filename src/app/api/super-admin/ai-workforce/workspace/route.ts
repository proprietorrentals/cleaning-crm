import { z } from "zod";
import type {
  AiActivityEntry,
  AiWorkspaceSavedItem,
  AiWorkspaceSnapshot,
} from "@/lib/ai-workforce/workspace-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const querySchema = z.object({
  employeeSlug: z.string().min(1),
});

type EmployeeRow = {
  id: string;
  slug: string;
  name: string;
};

type SavedContentRow = {
  id: string;
  title: string;
  content_type: string;
  content: string;
  status: "draft" | "awaiting_approval" | "approved" | "rejected" | "completed";
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
};

type TaskRow = {
  id: string;
  status: "draft" | "awaiting_approval" | "approved" | "rejected" | "completed";
  approval_status:
    | "draft"
    | "awaiting_approval"
    | "approved"
    | "rejected"
    | "completed";
  approved_at: string | null;
  completed_at: string | null;
  updated_at: string;
  saved_content_id: string | null;
  output_data: Record<string, unknown>;
};

function extractHistory(
  taskRow: TaskRow,
  employeeName: string,
  contextMetadata: Record<string, unknown> | null,
): AiActivityEntry[] {
  const raw = taskRow.output_data?.history;
  if (!Array.isArray(raw)) {
    return [];
  }

  const events: AiActivityEntry[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const action = (entry as { action?: unknown }).action;
    const timestamp = (entry as { timestamp?: unknown }).timestamp;
    const relatedContentId = (entry as { related_content_id?: unknown })
      .related_content_id;
    const resultingStatus = (entry as { resulting_status?: unknown })
      .resulting_status;
    const title = (entry as { title?: unknown }).title;

    if (
      typeof action !== "string" ||
      typeof timestamp !== "string" ||
      typeof relatedContentId !== "string" ||
      typeof resultingStatus !== "string" ||
      typeof title !== "string"
    ) {
      continue;
    }

    events.push({
      id:
        typeof (entry as { id?: unknown }).id === "string"
          ? (entry as { id: string }).id
          : crypto.randomUUID(),
      action: action as AiActivityEntry["action"],
      employee: employeeName,
      timestamp,
      relatedContentId,
      relatedTaskId: taskRow.id,
      resultingStatus: resultingStatus as AiActivityEntry["resultingStatus"],
      title,
      prospectOrCustomer:
        typeof contextMetadata?.prospect_or_customer === "string"
          ? contextMetadata.prospect_or_customer
          : null,
      company:
        typeof contextMetadata?.company_name === "string"
          ? contextMetadata.company_name
          : null,
      callType:
        typeof contextMetadata?.call_type === "string"
          ? contextMetadata.call_type
          : null,
      objective:
        typeof contextMetadata?.call_objective === "string"
          ? contextMetadata.call_objective
          : null,
      date:
        typeof contextMetadata?.call_date === "string"
          ? contextMetadata.call_date
          : null,
    });
  }

  return events;
}

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    employeeSlug: url.searchParams.get("employeeSlug") ?? "",
  });

  if (!parsedQuery.success) {
    return Response.json(
      { success: false, message: "Invalid employee slug." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: employeeRow, error: employeeError } = await supabase
    .from("ai_employees")
    .select("id,slug,name")
    .eq("slug", parsedQuery.data.employeeSlug)
    .maybeSingle<EmployeeRow>();

  if (employeeError || !employeeRow) {
    return Response.json(
      { success: false, message: "Unknown AI employee." },
      { status: 404 },
    );
  }

  const [savedContentResult, taskResult] = await Promise.all([
    supabase
      .from("ai_saved_content")
      .select("id,title,content_type,content,status,created_at,updated_at,metadata")
      .eq("employee_id", employeeRow.id)
      .eq("super_admin_user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("ai_tasks")
      .select(
        "id,status,approval_status,approved_at,completed_at,updated_at,saved_content_id,output_data",
      )
      .eq("employee_id", employeeRow.id)
      .eq("super_admin_user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  if (savedContentResult.error || taskResult.error) {
    return Response.json(
      { success: false, message: "Unable to load saved workspace state." },
      { status: 503 },
    );
  }

  const tasksByContentId = new Map<string, TaskRow>();
  for (const task of (taskResult.data ?? []) as TaskRow[]) {
    const contentId = task.saved_content_id ?? task.output_data?.content_id;
    if (typeof contentId !== "string") {
      continue;
    }

    if (!tasksByContentId.has(contentId)) {
      tasksByContentId.set(contentId, task);
    }
  }

  const savedItems: AiWorkspaceSavedItem[] = (
    (savedContentResult.data ?? []) as SavedContentRow[]
  ).map((row) => {
    const linkedTask = tasksByContentId.get(row.id) ?? null;

    return {
      id: row.id,
      employeeSlug: employeeRow.slug,
      title: row.title,
      contentType: row.content_type,
      content: row.content,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      approvedAt: linkedTask?.approved_at ?? null,
      completedAt: linkedTask?.completed_at ?? null,
      taskId: linkedTask?.id ?? null,
      metadata: row.metadata,
    };
  });

  const activity: AiActivityEntry[] = ((taskResult.data ?? []) as TaskRow[])
    .flatMap((task) => {
      const linkedSaved = savedItems.find((item) => item.taskId === task.id);
      return extractHistory(
        task,
        employeeRow.name,
        (linkedSaved?.metadata ?? null) as Record<string, unknown> | null,
      );
    })
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  const snapshot: AiWorkspaceSnapshot = {
    employeeSlug: employeeRow.slug,
    savedItems,
    activity,
  };

  return Response.json({ success: true, data: snapshot });
}
