import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildOpportunityScoringInput,
  scoreCommercialCleaningOpportunity,
} from "@/lib/lead-marketplace/opportunity-scoring";
import { researchBusiness } from "@/lib/lead-marketplace/research-business";

export const POTENTIAL_LEAD_SELECT =
  "potential_lead_id,business_name,website,phone,email,address,city,state,zip_code,property_type,estimated_building_size,estimated_monthly_contract_value,contract_value_confidence,outsourcing_likelihood,organization_type,opportunity_summary,recommended_next_step,procurement_notes,estimated_contract_value,opportunity_score,opportunity_grade,score_breakdown,score_version,scored_at,ai_confidence,ai_reasoning,research_notes,research_sources,needs_manual_verification,status,verified_marketplace_lead_id,reviewed_by_user_id,reviewed_at,verified_at,rejected_at,discovered_via,discovery_run_id,discovery_category,discovered_at,created_at,updated_at";

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
  opportunity_score: number | null;
  opportunity_grade: "A+" | "A" | "B" | "C" | "D" | null;
  score_breakdown: {
    version: string;
    scoredAt: string;
    total: number;
    grade: "A+" | "A" | "B" | "C" | "D";
    ineligible: boolean;
    items: Array<{
      factor: string;
      points: number;
      evidence: string[];
      penalty?: string;
    }>;
  } | null;
  score_version: string | null;
  scored_at: string | null;
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

type PotentialLeadResearchData = {
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
  }>;
  needs_manual_verification: boolean;
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

function buildFallbackAddress(input: {
  address: string | null;
  city: string | null;
  state: string | null;
}) {
  return (
    input.address ??
    ([input.city, input.state].filter(Boolean).join(", ") ||
      "Address needs manual verification")
  );
}

function buildResearchPayload(params: {
  research: Awaited<ReturnType<typeof researchBusiness>>;
  fallbackCity: string | null;
  fallbackState: string | null;
}): PotentialLeadResearchData {
  return {
    website: params.research.website,
    phone: params.research.phone,
    email: params.research.email,
    address: buildFallbackAddress({
      address: params.research.address,
      city: params.research.city ?? params.fallbackCity,
      state: params.research.state ?? params.fallbackState,
    }),
    city: params.research.city ?? params.fallbackCity ?? "Unknown",
    state: (
      params.research.state ??
      params.fallbackState ??
      "Unknown"
    ).toUpperCase(),
    zip_code: params.research.zipCode,
    property_type: params.research.propertyType,
    estimated_building_size: params.research.estimatedBuildingSize,
    estimated_monthly_contract_value:
      params.research.estimatedMonthlyContractValue,
    contract_value_confidence: params.research.contractValueConfidence,
    outsourcing_likelihood: params.research.outsourcingLikelihood,
    organization_type: params.research.organizationType,
    opportunity_summary: params.research.opportunitySummary,
    recommended_next_step: params.research.recommendedNextStep,
    procurement_notes: params.research.procurementNotes,
    estimated_contract_value: params.research.estimatedContractValue,
    ai_confidence: params.research.aiConfidence,
    ai_reasoning: params.research.aiReasoning,
    research_notes: params.research.researchNotes,
    research_sources: params.research.sources,
    needs_manual_verification: params.research.needsManualVerification,
  };
}

function applyOpportunityScore(
  researchPayload: PotentialLeadResearchData,
  uncertainFields: string[],
) {
  const scoringInput = buildOpportunityScoringInput({
    website: researchPayload.website,
    phone: researchPayload.phone,
    address: researchPayload.address,
    city: researchPayload.city,
    state: researchPayload.state,
    propertyType: researchPayload.property_type,
    estimatedBuildingSize: researchPayload.estimated_building_size,
    outsourcingLikelihood: researchPayload.outsourcing_likelihood,
    organizationType: researchPayload.organization_type,
    procurementNotes: researchPayload.procurement_notes,
    recommendedNextStep: researchPayload.recommended_next_step,
    opportunitySummary: researchPayload.opportunity_summary,
    researchNotes: researchPayload.research_notes,
    sources: researchPayload.research_sources,
    needsManualVerification: researchPayload.needs_manual_verification,
    uncertainFields,
    contractValueConfidence: researchPayload.contract_value_confidence,
  });

  return scoreCommercialCleaningOpportunity(scoringInput);
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

  const researchPayload = buildResearchPayload({
    research,
    fallbackCity: requestInput.city,
    fallbackState: requestInput.state,
  });

  const scoring = applyOpportunityScore(
    researchPayload,
    research.uncertainFields,
  );

  const insertPayload = {
    business_name: requestInput.businessName,
    ...researchPayload,
    opportunity_score: scoring.opportunityScore,
    opportunity_grade: scoring.opportunityGrade,
    score_breakdown: scoring.scoreBreakdown,
    score_version: scoring.scoreVersion,
    scored_at: scoring.scoredAt,
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

export async function refreshPotentialLeadResearch(params: {
  supabase: SupabaseClient;
  leadId: string;
  input: {
    businessName: string;
    city?: string | null;
    state?: string | null;
    website?: string | null;
  };
}) {
  const research = await researchBusiness({
    businessName: normalizeWhitespace(params.input.businessName),
    city: params.input.city?.trim() || null,
    state: params.input.state?.trim() || null,
    website: params.input.website?.trim() || null,
  });

  const researchPayload = buildResearchPayload({
    research,
    fallbackCity: params.input.city ?? null,
    fallbackState: params.input.state ?? null,
  });

  const scoring = applyOpportunityScore(
    researchPayload,
    research.uncertainFields,
  );

  const { data, error } = await params.supabase
    .from("potential_marketplace_leads")
    .update({
      ...researchPayload,
      opportunity_score: scoring.opportunityScore,
      opportunity_grade: scoring.opportunityGrade,
      score_breakdown: scoring.scoreBreakdown,
      score_version: scoring.scoreVersion,
      scored_at: scoring.scoredAt,
    })
    .eq("potential_lead_id", params.leadId)
    .select(POTENTIAL_LEAD_SELECT)
    .single<PotentialLeadRow>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    lead: data,
    research: {
      needsManualVerification: research.needsManualVerification,
      uncertainFields: research.uncertainFields,
      sourceCount: research.sources.length,
    },
  };
}

export async function backfillPotentialLeadOpportunityScores(params: {
  supabase: SupabaseClient;
  limit?: number;
}) {
  const { data, error } = await params.supabase
    .from("potential_marketplace_leads")
    .select(POTENTIAL_LEAD_SELECT)
    .is("opportunity_score", null)
    .order("created_at", { ascending: true })
    .limit(params.limit ?? 200);

  if (error) {
    throw new Error(error.message);
  }

  const leads = (data ?? []) as PotentialLeadRow[];
  let updatedCount = 0;

  for (const lead of leads) {
    const scoring = scoreCommercialCleaningOpportunity(
      buildOpportunityScoringInput({
        website: lead.website,
        phone: lead.phone,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        propertyType: lead.property_type,
        estimatedBuildingSize: lead.estimated_building_size,
        outsourcingLikelihood: lead.outsourcing_likelihood,
        organizationType: lead.organization_type,
        procurementNotes: lead.procurement_notes,
        recommendedNextStep: lead.recommended_next_step,
        opportunitySummary: lead.opportunity_summary,
        researchNotes: lead.research_notes,
        sources: lead.research_sources,
        needsManualVerification: lead.needs_manual_verification,
        uncertainFields: [],
        contractValueConfidence: lead.contract_value_confidence,
      }),
    );

    const updateResult = await params.supabase
      .from("potential_marketplace_leads")
      .update({
        opportunity_score: scoring.opportunityScore,
        opportunity_grade: scoring.opportunityGrade,
        score_breakdown: scoring.scoreBreakdown,
        score_version: scoring.scoreVersion,
        scored_at: scoring.scoredAt,
      })
      .eq("potential_lead_id", lead.potential_lead_id);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    updatedCount += 1;
  }

  return {
    scanned: leads.length,
    updated: updatedCount,
  };
}
