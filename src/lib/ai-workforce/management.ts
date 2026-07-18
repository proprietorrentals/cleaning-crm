import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_EMPLOYEES } from "@/lib/ai-workforce/employees";
import { resolveAiEmployee } from "@/lib/ai-workforce/resolve-employee";

export function startOfWeekIso(dateInput?: string | Date) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  const monday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - diff);
  return monday.toISOString().slice(0, 10);
}

export function endOfWeekIso(weekStart: string) {
  const date = new Date(`${weekStart}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

export function mapPriorityLabel(priority: string) {
  if (priority === "low") return "Low";
  if (priority === "medium") return "Medium";
  if (priority === "high") return "High";
  return "Urgent";
}

const RECURRING_TEMPLATES: Record<string, string[]> = {
  "sales-manager": [
    "Review pipeline",
    "Prepare outreach list",
    "Draft follow-ups",
    "Review objections",
  ],
  "marketing-manager": [
    "Create weekly content plan",
    "Draft social posts",
    "Review SEO opportunities",
    "Prepare campaign summary",
  ],
  "lead-researcher": [
    "Research target companies",
    "Verify contacts",
    "Score prospects",
    "Prepare research packets",
  ],
  "operations-manager": [
    "Review workflows",
    "Identify bottlenecks",
    "Create SOP improvements",
    "Review quality-control needs",
  ],
  "customer-success-manager": [
    "Review customer health",
    "Identify renewal risks",
    "Prepare follow-ups",
    "Find expansion opportunities",
  ],
  "voice-representative": [
    "Prepare call lists",
    "Draft call scripts",
    "Update objection responses",
    "Prepare follow-up messages",
  ],
};

export async function ensureRecurringAssignments(
  supabase: SupabaseClient,
  userId: string,
  weekStartDate?: string,
) {
  const weekStart = weekStartDate ?? startOfWeekIso();
  const weekEnd = endOfWeekIso(weekStart);

  const activeEmployees = AI_EMPLOYEES.filter(
    (employee) => employee.status === "active",
  );
  for (const employee of activeEmployees) {
    const resolved = await resolveAiEmployee(supabase, employee.slug);
    const employeeRow = resolved.employeeRow;
    if (!employeeRow) continue;

    const templateTitles = RECURRING_TEMPLATES[employee.slug] ?? [];
    for (const title of templateTitles) {
      const { data: recurringRow } = await supabase
        .from("ai_recurring_tasks")
        .upsert(
          {
            employee_id: employeeRow.id,
            super_admin_user_id: userId,
            title,
            instructions: `${title} for ${weekStart} week operations`,
            priority: "medium",
            approval_required: true,
            day_of_week: 1,
            is_active: true,
            checklist_items: [title],
          },
          {
            onConflict: "super_admin_user_id,employee_id,title",
            ignoreDuplicates: false,
          },
        )
        .select("id,title,instructions,priority,approval_required")
        .maybeSingle();

      if (!recurringRow) continue;

      await supabase.from("ai_assignments").upsert(
        {
          employee_id: employeeRow.id,
          super_admin_user_id: userId,
          recurring_task_id: recurringRow.id,
          title: recurringRow.title,
          instructions: recurringRow.instructions,
          due_date: weekEnd,
          week_start_date: weekStart,
          priority: recurringRow.priority,
          status: "assigned",
          approval_required: recurringRow.approval_required,
          is_recurring: true,
          is_one_time: false,
        },
        {
          onConflict: "recurring_task_id,week_start_date",
          ignoreDuplicates: true,
        },
      );
    }
  }
}

export async function ensureAccessAndUser() {
  const { requireSuperAdminAccess } = await import(
    "@/lib/supabase/super-admin"
  );
  const access = await requireSuperAdminAccess();

  if (access.needsAuth) {
    return {
      error: Response.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      ),
    };
  }
  if (access.denied) {
    return {
      error: Response.json(
        { success: false, message: "Super Admin access required." },
        { status: 403 },
      ),
    };
  }
  if (access.rpcError) {
    return {
      error: Response.json(
        { success: false, message: "Unable to verify Super Admin access." },
        { status: 503 },
      ),
    };
  }

  const userId = access.user?.id;
  if (!userId) {
    return {
      error: Response.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  return { userId };
}
