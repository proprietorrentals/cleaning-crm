import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { researchBusiness } from "@/lib/lead-marketplace/research-business";

export const POTENTIAL_LEAD_SELECT =
  "potential_lead_id,business_name,website,phone,email,address,city,state,zip_code,property_type,estimated_building_size,estimated_monthly_contract_value,contract_value_confidence,outsourcing_likelihood,organization_type,opportunity_summary,recommended_next_step,procurement_notes,estimated_contract_value,ai_confidence,ai_reasoning,research_notes,research_sources,needs_manual_verification,status,verified_marketplace_lead_id,reviewed_by_user_id,reviewed_at,verified_at,rejected_at,discovered_via,discovery_run_id,discovery_category,discovered_at,created_at,updated_at";

export type PotentialLeadStatus =
  | "New"
  | "AI Reviewed"
  | "Needs Review"
  | "Verified"
  | "Rejected";

export type PotentialLeadRow = {
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
  status: PotentialLeadStatus;
  verified_marketplace_lead_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  discovered_via: "manual" | "discovery";
  discovery_run_id: string | null;
  discovery_category: string | null;
  discovered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PotentialLeadDiscoveryMeta = {
  discoveredVia: "manual" | "discovery";
  discoveryRunId?: string | null;
  discoveryCategory?: string | null;
};

export type CreatePotentialLeadInput = {
  businessName: string;
  city?: string | null;
  state?: string | null;
  website?: string | null;
};

export type CreatePotentialLeadResult =
  | {
      duplicate: true;
      lead: PotentialLeadRow;
      message: string;
    }
  | {
      duplicate: false;
      lead: PotentialLeadRow;
      message: string;
      research: {
        needsManualVerification: boolean;
        uncertainFields: string[];
        sourceCount: number;
      };
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
    const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
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

  return (
    score >= 3 ||
    (nameMatch && locationMatch) ||
    (domainMatch && locationMatch) ||
    (phoneMatch && nameMatch)
  );
}

export async function createPotentialLeadFromResearch(params: {
  supabase: SupabaseClient;
  input: CreatePotentialLeadInput;
  discovery?: PotentialLeadDiscoveryMeta;
}): Promise<CreatePotentialLeadResult> {
  const requestInput = {
    businessName: normalizeWhitespace(params.input.businessName),
    city: params.input.city?.trim() || null,
    state: params.input.state?.trim() || null,
    website: params.input.website?.trim() || null,
  };

  const research = await researchBusiness(requestInput);

  const stateFilter = normalizeLocation(research.state ?? requestInput.state);
  const cityFilter = normalizeLocation(research.city ?? requestInput.city);
  const websiteDomain = normalizeDomain(research.website);
  const normalizedPhone = normalizePhone(research.phone);

  const duplicateQuery = params.supabase
    .from("potential_marketplace_leads")
    .select(POTENTIAL_LEAD_SELECT)
    .order("created_at", { ascending: false })
    .limit(120);

  const { data: candidates, error: duplicateLoadError } = await duplicateQuery;

  if (duplicateLoadError) {
    throw new Error(duplicateLoadError.message);
  }

  const existingLead = ((candidates ?? []) as PotentialLeadRow[]).find(
    (candidate) =>
      hasLikelyDuplicate({
        businessName: requestInput.businessName,
        website: websiteDomain,
        phone: normalizedPhone,
        city: cityFilter,
        state: stateFilter,
        row: candidate,
      }),
  );

  if (existingLead) {
    return {
      duplicate: true,
      lead: existingLead,
      message:
        "Likely duplicate detected. Existing potential lead returned instead of creating a new record.",
    };
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
    discovered_via: params.discovery?.discoveredVia ?? "manual",
    discovery_run_id: params.discovery?.discoveryRunId ?? null,
    discovery_category: params.discovery?.discoveryCategory ?? null,
    discovered_at:
      params.discovery?.discoveredVia === "discovery"
        ? new Date().toISOString()
        : null,
  };

  const { data: insertedLead, error: insertError } = await params.supabase
    .from("potential_marketplace_leads")
    .insert(insertPayload)
    .select(POTENTIAL_LEAD_SELECT)
    .single<PotentialLeadRow>();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    duplicate: false,
    message: "Business research completed and potential lead created.",
    lead: insertedLead,
    research: {
      needsManualVerification: research.needsManualVerification,
      uncertainFields: research.uncertainFields,
      sourceCount: research.sources.length,
    },
  };
}
