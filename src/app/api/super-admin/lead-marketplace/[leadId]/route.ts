import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildDuplicateLookupTokens,
  type DuplicateSignal,
  qualifyMarketplaceLead,
} from "@/lib/lead-marketplace/qualification";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

type MarketplaceLeadRow = {
  lead_id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  square_footage: number;
  cleaning_frequency: string;
  service_requested: string;
  budget: string | null;
  preferred_start_date: string;
  notes: string | null;
  photo_urls: string[] | null;
  status: string;
  qualification_status: "New" | "Needs Review" | "Verified" | "Rejected";
  quality_score: number;
  lead_grade: "A+" | "A" | "B" | "C" | "D";
  estimated_monthly_value: number;
  estimated_annual_value: number;
  close_probability: number;
  urgency_score: number;
  completeness_score: number;
  duplicate_risk: number;
  spam_risk: number;
  qualification_summary: string | null;
  scoring_breakdown: Record<string, unknown> | null;
  verified_at: string | null;
  verified_by: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify") }),
  z.object({
    action: z.literal("reject"),
    changeSummary: z.string().trim().max(1000).optional(),
  }),
  z.object({ action: z.literal("requalify") }),
  z.object({ action: z.literal("notes"), internalNotes: z.string().max(6000) }),
  z.object({
    action: z.literal("override"),
    qualityScore: z.number().int().min(0).max(100).optional(),
    leadGrade: z.enum(["A+", "A", "B", "C", "D"]).optional(),
    estimatedMonthlyValue: z.number().min(0).max(100000000).optional(),
    estimatedAnnualValue: z.number().min(0).max(100000000).optional(),
    closeProbability: z.number().min(0).max(1).optional(),
    qualificationStatus: z
      .enum(["New", "Needs Review", "Verified", "Rejected"])
      .optional(),
    urgencyScore: z.number().int().min(0).max(100).optional(),
    completenessScore: z.number().int().min(0).max(100).optional(),
    internalNotes: z.string().max(6000).optional(),
    changeSummary: z.string().trim().max(1000).optional(),
  }),
]);

async function ensureAccess() {
  const access = await requireSuperAdminAccess();

  if (access.needsAuth) {
    return {
      deniedResponse: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      ),
      access,
    };
  }

  if (access.denied) {
    return {
      deniedResponse: NextResponse.json(
        { success: false, message: "Super Admin access required." },
        { status: 403 },
      ),
      access,
    };
  }

  if (access.rpcError) {
    return {
      deniedResponse: NextResponse.json(
        { success: false, message: "Unable to verify Super Admin access." },
        { status: 503 },
      ),
      access,
    };
  }

  return { deniedResponse: null, access };
}

async function loadLead(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  leadId: string,
) {
  const { data, error } = await supabase
    .from("marketplace_leads")
    .select(
      "lead_id,business_name,contact_name,email,phone,address,city,state,zip_code,property_type,square_footage,cleaning_frequency,service_requested,budget,preferred_start_date,notes,photo_urls,status,qualification_status,quality_score,lead_grade,estimated_monthly_value,estimated_annual_value,close_probability,urgency_score,completeness_score,duplicate_risk,spam_risk,qualification_summary,scoring_breakdown,verified_at,verified_by,internal_notes,created_at,updated_at",
    )
    .eq("lead_id", leadId)
    .maybeSingle<MarketplaceLeadRow>();

  if (error) {
    throw new Error(`Unable to load lead: ${error.message}`);
  }

  return data;
}

async function findDuplicateSignals(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  lead: MarketplaceLeadRow,
) {
  const tokens = buildDuplicateLookupTokens({
    businessName: lead.business_name,
    email: lead.email,
    phone: lead.phone,
    address: lead.address,
    city: lead.city,
  });

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
      .neq("lead_id", lead.lead_id)
      .limit(8),
    supabase
      .from("marketplace_leads")
      .select("lead_id,created_at,phone")
      .eq("phone", lead.phone)
      .neq("lead_id", lead.lead_id)
      .limit(8),
    supabase
      .from("marketplace_leads")
      .select("lead_id,created_at,address,business_name")
      .eq("address", lead.address)
      .eq("business_name", lead.business_name)
      .neq("lead_id", lead.lead_id)
      .limit(8),
    supabase
      .from("marketplace_leads")
      .select("lead_id,created_at,business_name,city")
      .eq("business_name", lead.business_name)
      .eq("city", lead.city)
      .neq("lead_id", lead.lead_id)
      .limit(8),
  ]);

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

async function writeAudit(args: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  leadId: string;
  changedBy: string;
  action: string;
  changeSummary?: string;
  beforeData: Record<string, unknown>;
  afterData: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await args.supabase
    .from("marketplace_lead_audit_history")
    .insert({
      lead_id: args.leadId,
      changed_by: args.changedBy,
      action: args.action,
      change_summary: args.changeSummary ?? null,
      before_data: args.beforeData,
      after_data: args.afterData,
      metadata: args.metadata ?? {},
    });

  if (error) {
    console.error("marketplace audit insert failed:", error.message);
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ leadId: string }> },
) {
  const { deniedResponse } = await ensureAccess();
  if (deniedResponse) {
    return deniedResponse;
  }

  const { leadId } = await context.params;
  const supabase = await createServerSupabaseClient();

  try {
    const lead = await loadLead(supabase, leadId);
    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found." },
        { status: 404 },
      );
    }

    const { data: history, error: historyError } = await supabase
      .from("marketplace_lead_audit_history")
      .select(
        "id,changed_at,changed_by,action,change_summary,before_data,after_data,metadata",
      )
      .eq("lead_id", leadId)
      .order("changed_at", { ascending: false })
      .limit(120);

    if (historyError) {
      return NextResponse.json(
        { success: false, message: historyError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      lead,
      history: history ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to load lead.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> },
) {
  const { deniedResponse, access } = await ensureAccess();
  if (deniedResponse) {
    return deniedResponse;
  }

  const userId = access.user?.id;
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 },
    );
  }

  const { leadId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const current = await loadLead(supabase, leadId);

  if (!current) {
    return NextResponse.json(
      { success: false, message: "Lead not found." },
      { status: 404 },
    );
  }

  const nowIso = new Date().toISOString();
  let patch: Record<string, unknown> = {};
  const action = parsed.data.action;
  let changeSummary: string | undefined;

  if (action === "verify") {
    patch = {
      qualification_status: "Verified",
      verified_at: nowIso,
      verified_by: userId,
    };
    changeSummary = "Lead marked as Verified by Super Admin.";
  }

  if (action === "reject") {
    patch = {
      qualification_status: "Rejected",
      verified_at: null,
      verified_by: null,
    };
    changeSummary =
      parsed.data.changeSummary || "Lead rejected by Super Admin.";
  }

  if (action === "notes") {
    patch = {
      internal_notes: parsed.data.internalNotes,
    };
    changeSummary = "Updated internal notes.";
  }

  if (action === "override") {
    patch = {
      quality_score: parsed.data.qualityScore ?? current.quality_score,
      lead_grade: parsed.data.leadGrade ?? current.lead_grade,
      estimated_monthly_value:
        parsed.data.estimatedMonthlyValue ?? current.estimated_monthly_value,
      estimated_annual_value:
        parsed.data.estimatedAnnualValue ?? current.estimated_annual_value,
      close_probability:
        parsed.data.closeProbability ?? current.close_probability,
      qualification_status:
        parsed.data.qualificationStatus ?? current.qualification_status,
      urgency_score: parsed.data.urgencyScore ?? current.urgency_score,
      completeness_score:
        parsed.data.completenessScore ?? current.completeness_score,
      internal_notes: parsed.data.internalNotes ?? current.internal_notes,
    };

    if ((patch.qualification_status as string) === "Verified") {
      patch.verified_at = nowIso;
      patch.verified_by = userId;
    }

    if ((patch.qualification_status as string) === "Rejected") {
      patch.verified_at = null;
      patch.verified_by = null;
    }

    changeSummary =
      parsed.data.changeSummary || "Manual lead override applied.";
  }

  if (action === "requalify") {
    const duplicateSignals = await findDuplicateSignals(supabase, current);
    const qualification = await qualifyMarketplaceLead({
      lead: {
        businessName: current.business_name,
        contactName: current.contact_name,
        email: current.email,
        phone: current.phone,
        address: current.address,
        city: current.city,
        state: current.state,
        zipCode: current.zip_code,
        propertyType: current.property_type,
        squareFootage: current.square_footage,
        cleaningFrequency: current.cleaning_frequency,
        serviceRequested: current.service_requested,
        budget: current.budget,
        preferredStartDate: current.preferred_start_date,
        notes: current.notes,
      },
      duplicateSignals,
    });

    patch = {
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
      qualification_last_run_at: nowIso,
      ai_score: qualification.qualityScore,
      estimated_contract_value: qualification.estimatedAnnualValue,
      qualification_status:
        current.qualification_status === "Verified" ||
        current.qualification_status === "Rejected"
          ? current.qualification_status
          : qualification.qualificationStatus,
    };

    changeSummary = "Qualification logic re-run with current lead data.";
  }

  const { data: updated, error: updateError } = await supabase
    .from("marketplace_leads")
    .update(patch)
    .eq("lead_id", leadId)
    .select(
      "lead_id,business_name,contact_name,email,phone,address,city,state,zip_code,property_type,square_footage,cleaning_frequency,service_requested,budget,preferred_start_date,notes,photo_urls,status,qualification_status,quality_score,lead_grade,estimated_monthly_value,estimated_annual_value,close_probability,urgency_score,completeness_score,duplicate_risk,spam_risk,qualification_summary,scoring_breakdown,verified_at,verified_by,internal_notes,created_at,updated_at",
    )
    .single<MarketplaceLeadRow>();

  if (updateError) {
    return NextResponse.json(
      { success: false, message: updateError.message },
      { status: 500 },
    );
  }

  await writeAudit({
    supabase,
    leadId,
    changedBy: userId,
    action,
    changeSummary,
    beforeData: current,
    afterData: updated,
    metadata: { changedAt: nowIso },
  });

  return NextResponse.json({
    success: true,
    lead: updated,
  });
}
