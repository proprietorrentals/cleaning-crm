import { z } from "zod";
import { AiProviderError, getAiProvider } from "@/lib/ai/provider";
import { resolveAiEmployee } from "@/lib/ai-workforce/resolve-employee";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const requestSchema = z.object({
  employeeSlug: z.string().min(1),
  prompt: z.string().min(1).max(8000),
  taskType: z.string().min(1).max(120),
  requestId: z.string().uuid().optional(),
  context: z.record(z.string(), z.string().max(1000)).default({}),
});

type GenerationUpsertRow = {
  saved_content_id: string;
  task_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  title: string;
  duplicate_prevented: boolean;
};

type SavedContentLookupRow = {
  id: string;
  status: string;
  title: string;
  content: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type TaskLookupRow = {
  id: string;
  output_data: Record<string, unknown> | null;
};

type PersistedGeneration = {
  savedContentId: string;
  taskId: string;
  status: string;
  title: string;
  content: string;
  createdAt: string;
  provider: string | null;
  model: string | null;
  isMock: boolean;
  generatedAt: string;
};

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readStringField(
  source: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = source?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readBooleanField(
  source: Record<string, unknown> | null,
  key: string,
): boolean | null {
  const value = source?.[key];
  return typeof value === "boolean" ? value : null;
}

async function loadPersistedGenerationByRequestId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  employeeId: string,
  requestId: string,
): Promise<{ data: PersistedGeneration | null; errorMessage: string | null }> {
  const { data: savedRow, error: savedLookupError } = await supabase
    .from("ai_saved_content")
    .select("id,status,title,content,created_at,metadata")
    .eq("super_admin_user_id", userId)
    .eq("employee_id", employeeId)
    .eq("request_id", requestId)
    .maybeSingle<SavedContentLookupRow>();

  if (savedLookupError) {
    return {
      data: null,
      errorMessage: "Unable to load generated content state.",
    };
  }

  if (!savedRow) {
    return { data: null, errorMessage: null };
  }

  const { data: taskRows, error: taskLookupError } = await supabase
    .from("ai_tasks")
    .select("id,output_data")
    .eq("super_admin_user_id", userId)
    .eq("employee_id", employeeId)
    .eq("saved_content_id", savedRow.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (taskLookupError) {
    return {
      data: null,
      errorMessage: "Unable to load linked task state.",
    };
  }

  const taskRow = (taskRows?.[0] as TaskLookupRow | undefined) ?? null;
  if (!taskRow?.id) {
    return {
      data: null,
      errorMessage: "Unable to resolve linked task row.",
    };
  }

  const metadata = readRecord(savedRow.metadata);
  const taskOutput = readRecord(taskRow.output_data);

  const provider =
    readStringField(metadata, "provider") ??
    readStringField(taskOutput, "provider");
  const model =
    readStringField(metadata, "model") ?? readStringField(taskOutput, "model");
  const isMock =
    readBooleanField(metadata, "is_mock") ??
    readBooleanField(taskOutput, "is_mock") ??
    false;
  const generatedAt =
    readStringField(metadata, "generated_at") ?? savedRow.created_at;

  return {
    data: {
      savedContentId: savedRow.id,
      taskId: taskRow.id,
      status: savedRow.status,
      title: savedRow.title,
      content: savedRow.content,
      createdAt: savedRow.created_at,
      provider,
      model,
      isMock,
      generatedAt,
    },
    errorMessage: null,
  };
}

function buildGenerationResponse(
  generation: PersistedGeneration,
  duplicatePrevented: boolean,
) {
  return Response.json({
    success: true,
    data: {
      content: generation.content,
      provider: generation.provider,
      model: generation.model,
      isMock: generation.isMock,
      savedContentId: generation.savedContentId,
      taskId: generation.taskId,
      status: generation.status,
      createdAt: generation.createdAt,
      generatedAt: generation.generatedAt,
      title: generation.title,
      duplicatePrevented,
    },
  });
}

function createDraftTitle(
  employeeName: string,
  taskType: string,
  prompt: string,
) {
  const normalizedTaskType = taskType
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
  const promptSnippet = prompt.trim().replace(/\s+/g, " ").slice(0, 80);

  return `${employeeName} ${normalizedTaskType} Draft: ${promptSnippet}`;
}

export async function POST(request: Request) {
  try {
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
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, message: "Invalid request payload." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { configEmployee, employeeRow, errorMessage } =
      await resolveAiEmployee(supabase, parsed.data.employeeSlug);

    if (!configEmployee || !employeeRow || errorMessage) {
      return Response.json(
        {
          success: false,
          message: errorMessage ?? "Unable to resolve AI employee.",
        },
        { status: 503 },
      );
    }

    if (configEmployee.status !== "active") {
      return Response.json(
        { success: false, message: "This employee is not active." },
        { status: 400 },
      );
    }

    const requestId = parsed.data.requestId ?? crypto.randomUUID();
    const existing = await loadPersistedGenerationByRequestId(
      supabase,
      userId,
      employeeRow.id,
      requestId,
    );

    if (existing.errorMessage) {
      return Response.json(
        { success: false, message: existing.errorMessage },
        { status: 503 },
      );
    }

    if (existing.data) {
      return buildGenerationResponse(existing.data, true);
    }

    const provider = getAiProvider();

    const result = await provider.generate({
      employeeSlug: configEmployee.slug,
      systemPrompt: [
        configEmployee.systemPrompt,
        "Task type:",
        parsed.data.taskType,
        "Safety policy:",
        "All outputs must be drafts only.",
        "Do not claim actions were executed.",
        "Require human review and approval before use.",
      ].join("\n"),
      userPrompt: parsed.data.prompt,
      context: parsed.data.context,
    });

    const title = createDraftTitle(
      employeeRow.name,
      parsed.data.taskType,
      parsed.data.prompt,
    );

    const { data: upsertRows, error: upsertError } = await supabase.rpc(
      "ai_workforce_upsert_generated_content",
      {
        p_employee_slug: configEmployee.slug,
        p_task_type: parsed.data.taskType,
        p_prompt: parsed.data.prompt,
        p_context: parsed.data.context,
        p_content: result.content,
        p_provider: result.provider,
        p_model: result.model,
        p_is_mock: result.isMock,
        p_request_id: requestId,
        p_title: title,
      },
    );

    if (upsertError) {
      return Response.json(
        { success: false, message: "Unable to persist generated content." },
        { status: 503 },
      );
    }

    const upsertRow = ((upsertRows as GenerationUpsertRow[] | null) ?? [])[0];
    if (!upsertRow) {
      return Response.json(
        { success: false, message: "Unable to resolve generated content." },
        { status: 503 },
      );
    }

    const persisted = await loadPersistedGenerationByRequestId(
      supabase,
      userId,
      employeeRow.id,
      requestId,
    );

    if (persisted.errorMessage || !persisted.data) {
      return Response.json(
        { success: false, message: "Unable to resolve generated content." },
        { status: 503 },
      );
    }

    return buildGenerationResponse(
      persisted.data,
      upsertRow.duplicate_prevented,
    );
  } catch (error) {
    if (error instanceof AiProviderError) {
      return Response.json(
        {
          success: false,
          message: "AI provider request failed.",
          diagnostics: {
            provider: error.details.provider,
            model: error.details.model,
            providerStatus: error.details.status,
            providerCode: error.details.code,
            providerType: error.details.type,
            providerMessage: error.details.message,
          },
        },
        { status: 502 },
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.error("AI workforce generation error:", error);
    }

    return Response.json(
      {
        success: false,
        message: "Unable to generate content right now.",
      },
      { status: 500 },
    );
  }
}
