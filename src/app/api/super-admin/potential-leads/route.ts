import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { researchBusiness } from "@/lib/lead-marketplace/research-business";
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

const createSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(50).optional(),
  website: z.string().trim().max(240).optional(),
});

type PotentialLeadRow = {
  potential_lead_id: string;
  business_name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  property_type: string;
  estimated_building_size: string | null;
  estimated_monthly_contract_value: number | null;
  contract_value_confidence: number;
  outsourcing_likelihood: "High" | "Medium" | "Low" | "Unknown";
  organization_type:
    | "public sector"
    | "education"
    | "healthcare"
    | "office"
    | "industrial"
    | "retail"
    | "multifamily"
    | "nonprofit"
    | "unknown";
  opportunity_summary: string | null;
  recommended_next_step: string | null;
  procurement_notes: string | null;
  estimated_contract_value: number;
  ai_confidence: number;
  ai_reasoning: string | null;
  research_notes: string | null;
  research_sources: Array<{
    name: string;
    url: string | null;
    note: string | null;
  }> | null;
  needs_manual_verification: boolean | null;
  status: "New" | "AI Reviewed" | "Needs Review" | "Verified" | "Rejected";
  verified_marketplace_lead_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeBusinessName(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(inc|llc|ltd|co|corp|corporation|company)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(value: string | null) {
  if (!value) {
    return null;
  }

  const digits = value.replace(/[^0-9]/g, "");
  return digits.length >= 10 ? digits : null;
}

function normalizeDomain(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(
      value.startsWith("http") ? value : `https://${value}`,
    );
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value
      .toLowerCase()
      .replace(/^www\./, "")
      .trim();
  }
}

function normalizeLocation(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = normalizeWhitespace(value).toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function hasLikelyDuplicate(input: {
  businessName: string;
  website: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  row: PotentialLeadRow;
}) {
  const inputName = normalizeBusinessName(input.businessName);
  const rowName = normalizeBusinessName(input.row.business_name);

  const inputDomain = normalizeDomain(input.website);
  const rowDomain = normalizeDomain(input.row.website);

  const inputPhone = normalizePhone(input.phone);
  const rowPhone = normalizePhone(input.row.phone);

  const inputCity = normalizeLocation(input.city);
  const rowCity = normalizeLocation(input.row.city);

  const inputState = normalizeLocation(input.state);
  const rowState = normalizeLocation(input.row.state);

  const nameMatch = inputName.length > 0 && inputName === rowName;
  const domainMatch = Boolean(
    inputDomain && rowDomain && inputDomain === rowDomain,
  );
  const phoneMatch = Boolean(inputPhone && rowPhone && inputPhone === rowPhone);
  const locationMatch =
    Boolean(inputCity && rowCity && inputCity === rowCity) &&
    Boolean(inputState && rowState && inputState === rowState);

  const score =
    (nameMatch ? 2 : 0) +
    (domainMatch ? 2 : 0) +
    (phoneMatch ? 2 : 0) +
    (locationMatch ? 1 : 0);

  return {
    isLikelyDuplicate:
      score >= 3 ||
      (nameMatch && locationMatch) ||
      (domainMatch && locationMatch) ||
      (phoneMatch && nameMatch),
    evidence: {
      nameMatch,
      domainMatch,
      phoneMatch,
      locationMatch,
      score,
    },
  };
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
    .select(
      "potential_lead_id,business_name,website,phone,email,address,city,state,zip_code,property_type,estimated_building_size,estimated_monthly_contract_value,contract_value_confidence,outsourcing_likelihood,organization_type,opportunity_summary,recommended_next_step,procurement_notes,estimated_contract_value,ai_confidence,ai_reasoning,research_notes,research_sources,needs_manual_verification,status,verified_marketplace_lead_id,reviewed_by_user_id,reviewed_at,verified_at,rejected_at,created_at,updated_at",
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

  const requestInput = {
    businessName: normalizeWhitespace(parsed.data.businessName),
    city: parsed.data.city?.trim() || null,
    state: parsed.data.state?.trim() || null,
    website: parsed.data.website?.trim() || null,
  };

  const supabase = await createServerSupabaseClient();

  const research = await researchBusiness(requestInput);

  const stateFilter = normalizeLocation(research.state ?? requestInput.state);
  const cityFilter = normalizeLocation(research.city ?? requestInput.city);
  const websiteDomain = normalizeDomain(research.website);
  const normalizedPhone = normalizePhone(research.phone);

  const duplicateQuery = supabase
    .from("potential_marketplace_leads")
    .select(
      "potential_lead_id,business_name,website,phone,email,address,city,state,zip_code,property_type,estimated_building_size,estimated_monthly_contract_value,contract_value_confidence,outsourcing_likelihood,organization_type,opportunity_summary,recommended_next_step,procurement_notes,estimated_contract_value,ai_confidence,ai_reasoning,research_notes,research_sources,needs_manual_verification,status,verified_marketplace_lead_id,reviewed_by_user_id,reviewed_at,verified_at,rejected_at,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(80);

  const { data: candidates, error: duplicateLoadError } = await duplicateQuery;

  if (duplicateLoadError) {
    return NextResponse.json(
      { success: false, message: duplicateLoadError.message },
      { status: 500 },
    );
  }

  const existingLead = ((candidates ?? []) as PotentialLeadRow[]).find(
    (candidate) => {
      const check = hasLikelyDuplicate({
        businessName: requestInput.businessName,
        website: websiteDomain,
        phone: normalizedPhone,
        city: cityFilter,
        state: stateFilter,
        row: candidate,
      });

      return check.isLikelyDuplicate;
    },
  );

  if (existingLead) {
    return NextResponse.json({
      success: true,
      duplicate: true,
      message:
        "Likely duplicate detected. Existing potential lead returned instead of creating a new record.",
      lead: existingLead,
    });
  }

  const fallbackAddress =
    research.address ??
    ([research.city ?? requestInput.city, research.state ?? requestInput.state]
      .filter(Boolean)
      .join(", ") ||
      "Address needs manual verification");

  const insertPayload = {
    business_name: requestInput.businessName,
    website: research.website,
    phone: research.phone,
    email: research.email,
    address: fallbackAddress,
    city: research.city ?? requestInput.city ?? "Unknown",
    state: (research.state ?? requestInput.state ?? "Unknown").toUpperCase(),
    zip_code: research.zipCode,
    property_type: research.propertyType,
    estimated_building_size: research.estimatedBuildingSize,
    estimated_monthly_contract_value: research.estimatedMonthlyContractValue,
    contract_value_confidence: research.contractValueConfidence,
    outsourcing_likelihood: research.outsourcingLikelihood,
    organization_type: research.organizationType,
    opportunity_summary: research.opportunitySummary,
    recommended_next_step: research.recommendedNextStep,
    procurement_notes: research.procurementNotes,
    estimated_contract_value: research.estimatedContractValue,
    ai_confidence: research.aiConfidence,
    ai_reasoning: research.aiReasoning,
    research_notes: research.researchNotes,
    research_sources: research.sources,
    needs_manual_verification: research.needsManualVerification,
    status: "AI Reviewed",
  };

  const { data: insertedLead, error: insertError } = await supabase
    .from("potential_marketplace_leads")
    .insert(insertPayload)
    .select(
      "potential_lead_id,business_name,website,phone,email,address,city,state,zip_code,property_type,estimated_building_size,estimated_monthly_contract_value,contract_value_confidence,outsourcing_likelihood,organization_type,opportunity_summary,recommended_next_step,procurement_notes,estimated_contract_value,ai_confidence,ai_reasoning,research_notes,research_sources,needs_manual_verification,status,verified_marketplace_lead_id,reviewed_by_user_id,reviewed_at,verified_at,rejected_at,created_at,updated_at",
    )
    .single<PotentialLeadRow>();

  if (insertError) {
    return NextResponse.json(
      { success: false, message: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      duplicate: false,
      message: "Business research completed and potential lead created.",
      lead: insertedLead,
      research: {
        needsManualVerification: research.needsManualVerification,
        uncertainFields: research.uncertainFields,
        sourceCount: research.sources.length,
      },
    },
    { status: 201 },
  );
}
