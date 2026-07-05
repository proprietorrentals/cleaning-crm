import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log("🔐 API Route - Admin Jobs Endpoint");
    console.log("  URL present:", !!supabaseUrl);
    console.log("  Service role key present:", !!serviceRoleKey);
    console.log("  Anon key present:", !!anonKey);

    if (!supabaseUrl) {
      return Response.json(
        {
          error: "Missing NEXT_PUBLIC_SUPABASE_URL",
          message: "Supabase URL not configured",
        },
        { status: 500 }
      );
    }

    // If service role key is not available, use anon key (will still be filtered by RLS)
    const key = serviceRoleKey || anonKey;

    if (!key) {
      return Response.json(
        {
          error: "Missing authentication key",
          message: "Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is configured",
          advice: "For admin pages to work without login, add SUPABASE_SERVICE_ROLE_KEY to .env.local",
        },
        { status: 500 }
      );
    }

    const keyType = serviceRoleKey ? "Service Role Key (RLS bypassed)" : "Anon Key (RLS active)";
    console.log(`  Using: ${keyType}`);

    // Create client with the available key
    const supabase = createClient(supabaseUrl, key);

    // Query 1: All jobs (no filters)
    console.log("  Fetching all jobs...");
    const allJobsResponse = await supabase.from("jobs").select("*");
    console.log(`    All jobs: ${allJobsResponse.data?.length ?? 0} rows`);

    // Query 2: Completed jobs only
    console.log("  Fetching completed jobs...");
    const completedJobsResponse = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "Completed");
    console.log(`    Completed jobs: ${completedJobsResponse.data?.length ?? 0} rows`);

    return Response.json({
      authenticated_method: keyType,
      all_jobs: {
        count: allJobsResponse.data?.length ?? 0,
        data: allJobsResponse.data,
        error: allJobsResponse.error,
      },
      completed_jobs: {
        count: completedJobsResponse.data?.length ?? 0,
        data: completedJobsResponse.data,
        error: completedJobsResponse.error,
      },
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
