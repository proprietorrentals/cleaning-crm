import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return Response.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all jobs with their raw data
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select("*");

    // Get all customers
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("*");

    // Get all invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("*");

    // Get all quotes
    const { data: quotes, error: quotesError } = await supabase
      .from("quotes")
      .select("*");

    const response = {
      database_info: {
        url: supabaseUrl,
        has_anon_key: !!supabaseKey,
      },
      jobs: {
        count: jobs?.length ?? 0,
        data: jobs ?? [],
        error: jobsError ? {
          message: jobsError.message,
          code: jobsError.code,
          details: jobsError.details,
        } : null,
        status_values: jobs?.map(j => ({
          id: j.id,
          status: j.status,
          status_type: typeof j.status,
          estimated_value: j.estimated_value,
          scheduled_date: j.scheduled_date,
        })) ?? [],
      },
      customers: {
        count: customers?.length ?? 0,
        error: customersError ? {
          message: customersError.message,
          code: customersError.code,
        } : null,
      },
      invoices: {
        count: invoices?.length ?? 0,
        error: invoicesError ? {
          message: invoicesError.message,
          code: invoicesError.code,
        } : null,
      },
      quotes: {
        count: quotes?.length ?? 0,
        error: quotesError ? {
          message: quotesError.message,
          code: quotesError.code,
        } : null,
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
