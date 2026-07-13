import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: adminRow }, { data: superAdminRow }] = await Promise.all([
      supabase.from("tenant_admins").select("id").eq("auth_user_id", user.id).maybeSingle(),
      supabase.from("super_admins").select("id").eq("auth_user_id", user.id).maybeSingle(),
    ]);

    if (!adminRow && !superAdminRow) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Query 1: Get all jobs (no filter)
    const { data: allJobs, error: allJobsError } = await supabase
      .from("jobs")
      .select("id,customer_id,assigned_employee_id,status,scheduled_date,created_at");

    // Query 2: Get jobs with status="Completed"
    const { data: completedJobs, error: completedError } = await supabase
      .from("jobs")
      .select("id,customer_id,assigned_employee_id,status,scheduled_date,created_at")
      .eq("status", "Completed");

    // Query 3: Get jobs with lowercase status
    const { data: completedLowerJobs, error: completedLowerError } = await supabase
      .from("jobs")
      .select("id,customer_id,assigned_employee_id,status,scheduled_date,created_at")
      .eq("status", "completed");

    // Query 4: Check table info (raw query)
    let tableInfo = null;
    let tableError = null;
    try {
      const result = await supabase.rpc("get_table_definition", {
        table_name: "jobs",
      });
      tableInfo = result.data;
      tableError = result.error;
    } catch (e) {
      tableError = { message: "RPC not available or error occurred" };
    }

    // Get all customers
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id,company_name,created_at");

    const response = {
      database_info: {
        has_authenticated_user: !!user,
      },
      queries: {
        all_jobs: {
          query: "SELECT * FROM jobs (no filter)",
          count: allJobs?.length ?? 0,
          data: allJobs ?? [],
          error: allJobsError ? {
            message: allJobsError.message,
            code: allJobsError.code,
            details: allJobsError.details,
            hint: allJobsError.hint,
          } : null,
          status_values: allJobs?.map((j: any) => ({
            id: j.id,
            status: j.status,
            status_length: j.status?.length,
            status_bytes: j.status ? Array.from(j.status).map((c: any) => (c as string).charCodeAt(0)) : null,
            scheduled_date: j.scheduled_date,
          })) ?? [],
        },
        completed_jobs: {
          query: ".eq('status', 'Completed')",
          count: completedJobs?.length ?? 0,
          data: completedJobs ?? [],
          error: completedError ? {
            message: completedError.message,
            code: completedError.code,
            details: completedError.details,
            hint: completedError.hint,
          } : null,
        },
        completed_lower_jobs: {
          query: ".eq('status', 'completed')",
          count: completedLowerJobs?.length ?? 0,
          data: completedLowerJobs ?? [],
          error: completedLowerError ? {
            message: completedLowerError.message,
            code: completedLowerError.code,
            details: completedLowerError.details,
          } : null,
        },
      },
      related_tables: {
        customers: {
          count: customers?.length ?? 0,
          error: customersError ? {
            message: customersError.message,
            code: customersError.code,
          } : null,
        },
      },
      advice: {
        issue: allJobs && allJobs.length === 0 ? "No jobs found in database at all" : "Jobs exist but filtering issue",
        possible_causes: [
          "No jobs have been created yet",
          "RLS policies blocking select",
          "Case sensitivity issue with status field",
          "Whitespace in status values",
          "Jobs table doesn't exist or is empty",
        ],
      },
    };

    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
