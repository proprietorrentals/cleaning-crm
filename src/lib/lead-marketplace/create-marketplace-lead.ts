import "server-only";

import {
  buildDuplicateLookupTokens,
  type DuplicateSignal,
  qualifyMarketplaceLead,
} from "@/lib/lead-marketplace/qualification";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type MarketplaceLeadSeedInput = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  squareFootage: number;
  cleaningFrequency: string;
  serviceRequested: string;
  budget: string | null;
  preferredStartDate: string;
  notes: string | null;
  photoUrls?: string[];
  honeypotValue?: string;
};

export type MarketplaceLeadCreateResult = {
  leadId: string;
  qualificationStatus: "New" | "Needs Review" | "Verified" | "Rejected";
};

async function findDuplicateSignals(params: {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}) {
  const supabase = createAdminSupabaseClient();
  const tokens = buildDuplicateLookupTokens(params);

  const [
    emailMatches,
    phoneMatches,
    addressBusinessMatches,
    businessCityMatches,
  ] = await Promise.all([
    supabase
      .from("marketplace_leads")
      .select("lead_id,created_at,email")
      .eq("email", tokens.email)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("marketplace_leads")
      .select("lead_id,created_at,phone")
      .eq("phone", params.phone)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("marketplace_leads")
      .select("lead_id,created_at,address,business_name")
      .eq("address", params.address)
      .eq("business_name", params.businessName)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("marketplace_leads")
      .select("lead_id,created_at,business_name,city")
      .eq("business_name", params.businessName)
      .eq("city", params.city)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const errors = [
    emailMatches.error,
    phoneMatches.error,
    addressBusinessMatches.error,
    businessCityMatches.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(
      `Failed to evaluate duplicate signals: ${errors.map((err) => err?.message).join(" | ")}`,
    );
  }

  const signals: DuplicateSignal[] = [];

  for (const row of emailMatches.data ?? []) {
    signals.push({
      leadId: row.lead_id,
      signalType: "email",
      matchedValue: row.email,
      createdAt: row.created_at,
    });
  }

  for (const row of phoneMatches.data ?? []) {
    signals.push({
      leadId: row.lead_id,
      signalType: "phone",
      matchedValue: row.phone,
      createdAt: row.created_at,
    });
  }

  for (const row of addressBusinessMatches.data ?? []) {
    signals.push({
      leadId: row.lead_id,
      signalType: "address_business",
      matchedValue: `${row.address} | ${row.business_name}`,
      createdAt: row.created_at,
    });
  }

  for (const row of businessCityMatches.data ?? []) {
    signals.push({
      leadId: row.lead_id,
      signalType: "business_city",
      matchedValue: `${row.business_name} | ${row.city}`,
      createdAt: row.created_at,
    });
  }

  return signals;
}

export async function createMarketplaceLeadFromSeed(
  input: MarketplaceLeadSeedInput,
): Promise<MarketplaceLeadCreateResult> {
  const duplicateSignals = await findDuplicateSignals({
    businessName: input.businessName,
    email: input.email,
    phone: input.phone,
    address: input.address,
    city: input.city,
  });

  const qualification = await qualifyMarketplaceLead({
    lead: {
      businessName: input.businessName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      city: input.city,
      state: input.state,
      zipCode: input.zipCode,
      propertyType: input.propertyType,
      squareFootage: input.squareFootage,
      cleaningFrequency: input.cleaningFrequency,
      serviceRequested: input.serviceRequested,
      budget: input.budget,
      preferredStartDate: input.preferredStartDate,
      notes: input.notes,
    },
    duplicateSignals,
    honeypotValue: input.honeypotValue,
  });

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("marketplace_leads")
    .insert({
      business_name: input.businessName,
      contact_name: input.contactName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      city: input.city,
      state: input.state,
      zip_code: input.zipCode,
      property_type: input.propertyType,
      square_footage: input.squareFootage,
      cleaning_frequency: input.cleaningFrequency,
      service_requested: input.serviceRequested,
      budget: input.budget,
      preferred_start_date: input.preferredStartDate,
      notes: input.notes,
      photo_urls: input.photoUrls ?? [],
      ai_score: qualification.qualityScore,
      estimated_contract_value: qualification.estimatedAnnualValue,
      qualification_status: qualification.qualificationStatus,
      quality_score: qualification.qualityScore,
      lead_grade: qualification.leadGrade,
      estimated_monthly_value: qualification.estimatedMonthlyValue,
      estimated_annual_value: qualification.estimatedAnnualValue,
      close_probability: qualification.closeProbability,
      urgency_score: qualification.urgencyScore,
      completeness_score: qualification.completenessScore,
      duplicate_risk: qualification.duplicateRisk,
      spam_risk: qualification.spamRisk,
      qualification_summary: qualification.qualificationSummary,
      scoring_breakdown: qualification.scoringBreakdown,
      qualification_last_run_at: new Date().toISOString(),
      status: "new",
    })
    .select("lead_id")
    .single();

  if (error) {
    throw new Error(`Failed to save lead: ${error.message}`);
  }

  return {
    leadId: data.lead_id,
    qualificationStatus: qualification.qualificationStatus,
  };
}
