import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const filterSchema = z.object({
  view: z
    .enum(["New", "Needs Review", "Verified", "Rejected", "All"])
    .optional(),
  status: z.string().trim().max(60).optional(),
  grade: z.string().trim().max(8).optional(),
  city: z.string().trim().max(100).optional(),
  zip: z.string().trim().max(20).optional(),
  propertyType: z.string().trim().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  fromDate: z.string().trim().max(30).optional(),
  toDate: z.string().trim().max(30).optional(),
  limit: z.coerce.number().min(1).max(1000).optional(),
});

async function ensureAccess() {
  const access = await requireSuperAdminAccess();

  if (access.needsAuth) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  if (access.denied) {
    return NextResponse.json(
      { success: false, message: "Super Admin access required." },
      { status: 403 },
    );
  }

  if (access.rpcError) {
    return NextResponse.json(
      { success: false, message: "Unable to verify Super Admin access." },
      { status: 503 },
    );
  }

  return null;
}

export async function GET(request: NextRequest) {
  const denied = await ensureAccess();
  if (denied) {
    return denied;
  }

  const parsed = filterSchema.safeParse({
    view: request.nextUrl.searchParams.get("view") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    grade: request.nextUrl.searchParams.get("grade") ?? undefined,
    city: request.nextUrl.searchParams.get("city") ?? undefined,
    zip: request.nextUrl.searchParams.get("zip") ?? undefined,
    propertyType: request.nextUrl.searchParams.get("propertyType") ?? undefined,
    search: request.nextUrl.searchParams.get("search") ?? undefined,
    minScore: request.nextUrl.searchParams.get("minScore") ?? undefined,
    maxScore: request.nextUrl.searchParams.get("maxScore") ?? undefined,
    fromDate: request.nextUrl.searchParams.get("fromDate") ?? undefined,
    toDate: request.nextUrl.searchParams.get("toDate") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid filter values.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const filter = parsed.data;
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("marketplace_leads")
    .select(
      "lead_id,business_name,contact_name,email,phone,address,city,state,zip_code,property_type,square_footage,cleaning_frequency,service_requested,budget,preferred_start_date,notes,photo_urls,status,qualification_status,quality_score,lead_grade,estimated_monthly_value,estimated_annual_value,close_probability,urgency_score,completeness_score,duplicate_risk,spam_risk,qualification_summary,verified_at,verified_by,internal_notes,claimed_at,claimed_by_user_id,claimed_by_user_email,claimed_company_id,claimed_sales_lead_id,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 500);

  if (filter.view && filter.view !== "All") {
    query = query.eq("qualification_status", filter.view);
  }

  if (filter.status) {
    query = query.eq("status", filter.status);
  }

  if (filter.grade) {
    query = query.eq("lead_grade", filter.grade);
  }

  if (filter.city) {
    query = query.ilike("city", `%${filter.city}%`);
  }

  if (filter.zip) {
    query = query.ilike("zip_code", `%${filter.zip}%`);
  }

  if (filter.propertyType) {
    query = query.ilike("property_type", `%${filter.propertyType}%`);
  }

  if (typeof filter.minScore === "number") {
    query = query.gte("quality_score", filter.minScore);
  }

  if (typeof filter.maxScore === "number") {
    query = query.lte("quality_score", filter.maxScore);
  }

  if (filter.fromDate) {
    query = query.gte("created_at", `${filter.fromDate}T00:00:00.000Z`);
  }

  if (filter.toDate) {
    query = query.lte("created_at", `${filter.toDate}T23:59:59.999Z`);
  }

  if (filter.search) {
    const escaped = filter.search.replace(/,/g, " ").trim();
    query = query.or(
      [
        `business_name.ilike.%${escaped}%`,
        `contact_name.ilike.%${escaped}%`,
        `email.ilike.%${escaped}%`,
        `phone.ilike.%${escaped}%`,
        `address.ilike.%${escaped}%`,
        `city.ilike.%${escaped}%`,
      ].join(","),
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, leads: data ?? [] });
}
