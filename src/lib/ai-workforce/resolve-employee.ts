import { getAiEmployeeBySlug } from "@/lib/ai-workforce/employees";

type EmployeeRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  system_prompt: string;
};

const COMING_SOON_PROMPT = "Coming soon in Phase 2.";

export async function resolveAiEmployee(
  supabase: any,
  slug: string,
): Promise<{
  configEmployee: ReturnType<typeof getAiEmployeeBySlug> | null;
  employeeRow: EmployeeRow | null;
  errorMessage: string | null;
}> {
  const configEmployee = getAiEmployeeBySlug(slug);

  if (!configEmployee) {
    return {
      configEmployee: null,
      employeeRow: null,
      errorMessage: "Unknown AI employee.",
    };
  }

  const { data: existingRow, error: lookupError } = await supabase
    .from("ai_employees")
    .select("id,slug,name,status,system_prompt")
    .eq("slug", slug)
    .maybeSingle();

  const existingEmployeeRow = (existingRow as EmployeeRow | null) ?? null;

  if (lookupError) {
    return {
      configEmployee,
      employeeRow: null,
      errorMessage: "Unable to resolve AI employee.",
    };
  }

  if (!existingEmployeeRow) {
    const { data: insertedRow, error: insertError } = await supabase
      .from("ai_employees")
      .insert({
        slug: configEmployee.slug,
        name: configEmployee.name,
        role: configEmployee.role,
        mission: configEmployee.mission,
        status: configEmployee.status,
        system_prompt: configEmployee.systemPrompt,
      })
      .select("id,slug,name,status,system_prompt")
      .maybeSingle();

    const insertedEmployeeRow = (insertedRow as EmployeeRow | null) ?? null;

    if (insertError || !insertedEmployeeRow) {
      return {
        configEmployee,
        employeeRow: null,
        errorMessage: "Unable to resolve AI employee.",
      };
    }

    return {
      configEmployee,
      employeeRow: insertedEmployeeRow,
      errorMessage: null,
    };
  }

  if (configEmployee.status !== "active") {
    return {
      configEmployee,
      employeeRow: existingEmployeeRow,
      errorMessage: null,
    };
  }

  const shouldUpdateStatus = existingEmployeeRow.status !== "active";
  const shouldUpdatePrompt =
    !existingEmployeeRow.system_prompt ||
    existingEmployeeRow.system_prompt === COMING_SOON_PROMPT;

  if (!shouldUpdateStatus && !shouldUpdatePrompt) {
    return {
      configEmployee,
      employeeRow: existingEmployeeRow,
      errorMessage: null,
    };
  }

  const { data: updatedRow, error: updateError } = await supabase
    .from("ai_employees")
    .update({
      status: "active",
      system_prompt: shouldUpdatePrompt
        ? configEmployee.systemPrompt
        : existingEmployeeRow.system_prompt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingEmployeeRow.id)
    .select("id,slug,name,status,system_prompt")
    .maybeSingle();

  const updatedEmployeeRow = (updatedRow as EmployeeRow | null) ?? null;

  if (updateError || !updatedEmployeeRow) {
    return {
      configEmployee,
      employeeRow: existingEmployeeRow,
      errorMessage: null,
    };
  }

  return {
    configEmployee,
    employeeRow: updatedEmployeeRow,
    errorMessage: null,
  };
}
