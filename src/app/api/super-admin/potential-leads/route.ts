import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createPotentialLeadFromResearch,
  POTENTIAL_LEAD_SELECT,
  type PotentialLeadRow,
} from "@/lib/lead-marketplace/potential-lead-pipeline";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const querySchema = z.object({
  scope: z.enum(["all", "potential", "verified", "research"]).optional(),
  status: z
    .enum(["New", "AI Reviewed", "Needs Review", "Verified", "Rejected"])
    .optional(),
  search: z.string().trim().min(1).max(120).optional(),
  state: z.string().trim().min(2).max(2).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  propertyType: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const createSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().length(2).optional(),
  website: z
    .string()
    .trim()
    .url()
    .max(250)
    .optional()
    .or(z.literal("")),
});

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

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
    .select(POTENTIAL_LEAD_SELECT)
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

  return NextResponse.json({
    success: true,
    leads: (data ?? []) as PotentialLeadRow[],
  });
}

export async function POST(request: NextRequest) {
  const denied = await ensureAccess();
  if (denied) {
    return denied;
  }

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid business research request.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();

  try {
    const result = await createPotentialLeadFromResearch({
      supabase,
      input: {
        businessName: normalizeWhitespace(parsed.data.businessName),
        city: parsed.data.city?.trim() || null,
        state: parsed.data.state?.trim() || null,
        website: parsed.data.website?.trim() || null,
      },
      discovery: {
        discoveredVia: "manual",
      },
    });

    if (result.duplicate) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: result.message,
        lead: result.lead,
      });
    }

    return NextResponse.json(
      {
        success: true,
        duplicate: false,
        message: result.message,
        lead: result.lead,
        research: result.research,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create potential lead.",
      },
      { status: 500 },
    );
  }
}
