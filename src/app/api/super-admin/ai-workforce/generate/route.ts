import { z } from "zod";
import { AiProviderError, getAiProvider } from "@/lib/ai/provider";
import { getAiEmployeeBySlug } from "@/lib/ai-workforce/employees";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const requestSchema = z.object({
  employeeSlug: z.string().min(1),
  prompt: z.string().min(1).max(8000),
  taskType: z.string().min(1).max(120),
  context: z.record(z.string(), z.string().max(1000)).default({}),
});

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

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, message: "Invalid request payload." },
        { status: 400 },
      );
    }

    const employee = getAiEmployeeBySlug(parsed.data.employeeSlug);

    if (!employee) {
      return Response.json(
        { success: false, message: "Unknown AI employee." },
        { status: 404 },
      );
    }

    if (employee.status !== "active") {
      return Response.json(
        { success: false, message: "This employee is not active in Phase 1." },
        { status: 400 },
      );
    }

    const provider = getAiProvider();

    const result = await provider.generate({
      employeeSlug: employee.slug,
      systemPrompt: [
        employee.systemPrompt,
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

    return Response.json({
      success: true,
      data: {
        content: result.content,
        provider: result.provider,
        model: result.model,
        isMock: result.isMock,
      },
    });
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
