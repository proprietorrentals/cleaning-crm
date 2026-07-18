import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureAccessAndUser } from "@/lib/ai-workforce/management";
import { AI_GOAL_PRIORITIES } from "@/lib/ai-workforce/management-types";
import { resolveAiEmployee } from "@/lib/ai-workforce/resolve-employee";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const recurringSchema = z.object({
  employeeSlug: z.string().min(1),
  title: z.string().min(3).max(200),
  instructions: z.string().max(8000).default(""),
  priority: z.enum(AI_GOAL_PRIORITIES).default("medium"),
  approvalRequired: z.boolean().default(true),
  dayOfWeek: z.number().int().min(0).max(6).default(1),
  isActive: z.boolean().default(true),
  checklistItems: z.array(z.string().min(1).max(300)).max(20).default([]),
});

type RecurringTaskRow = {
  id: string;
  title: string;
  instructions: string;
  priority: string;
  approval_required: boolean;
  day_of_week: number;
  is_active: boolean;
  checklist_items: unknown;
  created_at: string;
  updated_at: string;
  employee: Array<{ slug: string; name: string }> | null;
};

export async function GET(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const supabase = await createServerSupabaseClient();
  const userId = access.userId;

  const employeeSlug = request.nextUrl.searchParams.get("employeeSlug");
  let query = supabase
    .from("ai_recurring_tasks")
    .select(
      "id,title,instructions,priority,approval_required,day_of_week,is_active,checklist_items,created_at,updated_at,employee:ai_employees(slug,name)",
    )
    .eq("super_admin_user_id", userId)
    .order("created_at", { ascending: false });

  if (employeeSlug) {
    const resolved = await resolveAiEmployee(supabase, employeeSlug);
    if (!resolved.employeeRow || resolved.errorMessage) {
      return NextResponse.json(
        {
          success: false,
          message: resolved.errorMessage ?? "Unknown AI employee.",
        },
        { status: 400 },
      );
    }
    query = query.eq("employee_id", resolved.employeeRow.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to load recurring tasks." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    recurringTasks: ((data ?? []) as RecurringTaskRow[]).map((row) => ({
      id: row.id,
      employeeSlug: row.employee?.[0]?.slug,
      employeeName: row.employee?.[0]?.name,
      title: row.title,
      instructions: row.instructions,
      priority: row.priority,
      approvalRequired: row.approval_required,
      dayOfWeek: row.day_of_week,
      isActive: row.is_active,
      checklistItems: Array.isArray(row.checklist_items)
        ? row.checklist_items
        : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = recurringSchema.safeParse(body);
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

  const supabase = await createServerSupabaseClient();
  const resolved = await resolveAiEmployee(supabase, parsed.data.employeeSlug);
  if (!resolved.employeeRow || resolved.errorMessage) {
    return NextResponse.json(
      {
        success: false,
        message: resolved.errorMessage ?? "Unknown AI employee.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("ai_recurring_tasks")
    .upsert(
      {
        employee_id: resolved.employeeRow.id,
        super_admin_user_id: access.userId,
        title: parsed.data.title,
        instructions: parsed.data.instructions,
        priority: parsed.data.priority,
        approval_required: parsed.data.approvalRequired,
        day_of_week: parsed.data.dayOfWeek,
        is_active: parsed.data.isActive,
        checklist_items: parsed.data.checklistItems,
      },
      {
        onConflict: "super_admin_user_id,employee_id,title",
        ignoreDuplicates: false,
      },
    )
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to save recurring task." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, recurringTaskId: data.id });
}

export async function DELETE(request: NextRequest) {
  const access = await ensureAccessAndUser();
  if ("error" in access) {
    return access.error;
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { success: false, message: "Recurring task id is required." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("ai_recurring_tasks")
    .delete()
    .eq("id", id)
    .eq("super_admin_user_id", access.userId);

  if (error) {
    return NextResponse.json(
      { success: false, message: "Unable to delete recurring task." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
