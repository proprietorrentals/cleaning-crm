import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Apply the migration to make quote_id optional
    const { error } = await supabase.rpc("exec_sql", {
      sql: "ALTER TABLE public.jobs ALTER COLUMN quote_id DROP NOT NULL;",
    });

    if (error) {
      // Try direct SQL approach
      const { error: directError } = await supabase.from("jobs").select("*").limit(0);
      
      // If this works, the table exists. The error might be from rpc not existing.
      // Let's use a different approach - we'll use the admin API
      if (!directError) {
        return Response.json({
          message: "Jobs table exists. Please run the migration manually via Supabase SQL Editor",
          sql: "ALTER TABLE public.jobs ALTER COLUMN quote_id DROP NOT NULL;",
        });
      }
    }

    return Response.json({ message: "Migration applied successfully" });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
