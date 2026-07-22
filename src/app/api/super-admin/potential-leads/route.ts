import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const querySchema = z.object({
  scope: z.enum(["potential", "verified", "research"]).optional(),
  status: z
    .enum(["New", "AI Reviewed", "Needs Review", "Verified", "Rejected"])
    .optional(),
  search: z.string().trim().max(200).optional(),
  state: z.string().trim().max(50).optional(),
  city: z.string().trim().max(100).optional(),
  propertyType: z.string().trim().max(120).optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
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

  const parsed = querySchema.safeParse({
    scope: request.nextUrl.searchParams.get("scope") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    search: request.nextUrl.searchParams.get("search") ?? undefined,
    state: request.nextUrl.searchParams.get("state") ?? undefined,
    city: request.nextUrl.searchParams.get("city") ?? undefined,
    propertyType: request.nextUrl.searchParams.get("propertyType") ?? undefined,
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
    .from("potential_marketplace_leads")
    .select(
      "potential_lead_id,business_name,website,phone,email,address,city,state,zip_code,property_type,estimated_contract_value,ai_confidence,ai_reasoning,research_notes,status,verified_marketplace_lead_id,reviewed_by_user_id,reviewed_at,verified_at,rejected_at,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 200);

  if (filter.scope === "potential") {
    query = query.in("status", ["New", "AI Reviewed", "Needs Review"]);
  }

  if (filter.scope === "verified") {
    query = query.eq("status", "Verified");
  }

  if (filter.scope === "research") {
    query = query.in("status", ["AI Reviewed", "Needs Review"]);
  }

  if (filter.status) {
    query = query.eq("status", filter.status);
  }

  if (filter.state) {
    query = query.eq("state", filter.state);
  }

  if (filter.city) {
    query = query.ilike("city", `%${filter.city}%`);
  }

  if (filter.propertyType) {
    query = query.ilike("property_type", `%${filter.propertyType}%`);
  }

  if (filter.search) {
    const escaped = filter.search.replace(/,/g, " ").trim();
    query = query.or(
      [
        `business_name.ilike.%${escaped}%`,
        `website.ilike.%${escaped}%`,
        `phone.ilike.%${escaped}%`,
        `email.ilike.%${escaped}%`,
        `address.ilike.%${escaped}%`,
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
