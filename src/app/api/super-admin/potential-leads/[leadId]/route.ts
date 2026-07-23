import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createMarketplaceLeadFromSeed } from "@/lib/lead-marketplace/create-marketplace-lead";
import { refreshPotentialLeadResearch } from "@/lib/lead-marketplace/potential-lead-pipeline";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSuperAdminAccess } from "@/lib/supabase/super-admin";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify") }),
  z.object({
    action: z.literal("reject"),
    note: z.string().max(4000).optional(),
  }),
  z.object({
    action: z.literal("needs_research"),
    note: z.string().max(4000).optional(),
  }),
  z.object({ action: z.literal("refresh_research") }),
]);

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
  estimated_contract_value: number;
  ai_confidence: number;
  ai_reasoning: string | null;
  research_notes: string | null;
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
  research_sources: Array<{
    name: string;
    url: string | null;
    note: string | null;
  }> | null;
  needs_manual_verification: boolean | null;
  opportunity_score: number | null;
  opportunity_grade: "A+" | "A" | "B" | "C" | "D" | null;
  score_breakdown: Record<string, unknown> | null;
  score_version: string | null;
  scored_at: string | null;
  status: "New" | "AI Reviewed" | "Needs Review" | "Verified" | "Rejected";
  verified_marketplace_lead_id: string | null;
};

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

function inferEmail(lead: PotentialLeadRow) {
  if (lead.email?.trim()) {
    return lead.email.trim().toLowerCase();
  }

  if (lead.website) {
    try {
      const normalized = lead.website.startsWith("http")
        ? lead.website
        : `https://${lead.website}`;
      const hostname = new URL(normalized).hostname
        .replace(/^www\./, "")
        .toLowerCase();

      if (hostname) {
        return `info@${hostname}`;
      }
    } catch {
      // Ignore URL parse failures and continue to fallback email.
    }
  }

  return `lead-${lead.potential_lead_id.slice(0, 8)}@unknown.local`;
}

function inferNotes(lead: PotentialLeadRow) {
  return [
    "Imported from Potential Leads workspace.",
    lead.website ? `Website: ${lead.website}` : null,
    lead.ai_reasoning ? `AI reasoning: ${lead.ai_reasoning}` : null,
    lead.research_notes ? `Research notes: ${lead.research_notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { deniedResponse, access } = await ensureAccess();
  if (deniedResponse) {
    return deniedResponse;
  }

  const userId = access.user?.id;
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Authenticated user is required." },
      { status: 401 },
    );
  }

  const { leadId } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid action payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: current, error: loadError } = await supabase
    .from("potential_marketplace_leads")
    .select(
      "potential_lead_id,business_name,website,phone,email,address,city,state,zip_code,property_type,estimated_building_size,estimated_monthly_contract_value,contract_value_confidence,outsourcing_likelihood,organization_type,opportunity_summary,recommended_next_step,procurement_notes,estimated_contract_value,opportunity_score,opportunity_grade,score_breakdown,score_version,scored_at,ai_confidence,ai_reasoning,research_notes,research_sources,needs_manual_verification,status,verified_marketplace_lead_id",
    )
    .eq("potential_lead_id", leadId)
    .maybeSingle<PotentialLeadRow>();

  if (loadError) {
    return NextResponse.json(
      { success: false, message: loadError.message },
      { status: 500 },
    );
  }

  if (!current) {
    return NextResponse.json(
      { success: false, message: "Potential lead not found." },
      { status: 404 },
    );
  }

  if (parsed.data.action === "refresh_research") {
    try {
      const refreshed = await refreshPotentialLeadResearch({
        supabase,
        leadId,
        input: {
          businessName: current.business_name,
          city: current.city,
          state: current.state,
          website: current.website,
        },
      });

      return NextResponse.json({
        success: true,
        action: "refresh_research",
        lead: refreshed.lead,
        research: refreshed.research,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Unable to refresh lead research.",
        },
        { status: 500 },
      );
    }
  }

  if (parsed.data.action === "verify") {
    if (current.verified_marketplace_lead_id) {
      return NextResponse.json(
        {
          success: true,
          message: "Lead already verified.",
          marketplaceLeadId: current.verified_marketplace_lead_id,
        },
        { status: 200 },
      );
    }

    if (!current.phone?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A phone number is required to verify this lead. Mark as Needs Review and continue research.",
        },
        { status: 400 },
      );
    }

    const verificationDate = new Date().toISOString();
    const preferredStartDate = verificationDate.slice(0, 10);
    const monthlyHint = Math.max(
      0,
      Math.round((current.estimated_contract_value || 0) / 12),
    );

    const createdLead = await createMarketplaceLeadFromSeed({
      businessName: current.business_name,
      contactName: `${current.business_name} Team`,
      email: inferEmail(current),
      phone: current.phone,
      address: current.address,
      city: current.city,
      state: current.state,
      zipCode: current.zip_code?.trim() || "00000",
      propertyType: current.property_type,
      squareFootage: 12000,
      cleaningFrequency: "Weekly",
      serviceRequested: `Commercial cleaning services for ${current.property_type.toLowerCase()} properties`,
      budget: monthlyHint > 0 ? `$${monthlyHint} monthly` : null,
      preferredStartDate,
      notes: inferNotes(current),
    });

    const { data: verifiedLead, error: updateError } = await supabase
      .from("potential_marketplace_leads")
      .update({
        status: "Verified",
        reviewed_by_user_id: userId,
        reviewed_at: verificationDate,
        verified_at: verificationDate,
        rejected_at: null,
        verified_marketplace_lead_id: createdLead.leadId,
      })
      .eq("potential_lead_id", leadId)
      .select(
        "potential_lead_id,status,verified_marketplace_lead_id,reviewed_at,verified_at,rejected_at",
      )
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      action: "verify",
      lead: verifiedLead,
      marketplaceLeadId: createdLead.leadId,
      qualificationStatus: createdLead.qualificationStatus,
    });
  }

  const nextStatus =
    parsed.data.action === "reject" ? "Rejected" : "Needs Review";

  const note =
    parsed.data.note?.trim() ||
    (parsed.data.action === "reject"
      ? "Rejected from Potential Leads workspace."
      : "Needs additional research before marketplace verification.");

  const nextResearchNotes = [current.research_notes, note]
    .filter((value) => Boolean(value && value.trim().length > 0))
    .join("\n\n")
    .slice(0, 16000);

  const nowIso = new Date().toISOString();

  const { data: updatedLead, error: updateError } = await supabase
    .from("potential_marketplace_leads")
    .update({
      status: nextStatus,
      research_notes: nextResearchNotes,
      reviewed_by_user_id: userId,
      reviewed_at: nowIso,
      verified_at: null,
      rejected_at: nextStatus === "Rejected" ? nowIso : null,
    })
    .eq("potential_lead_id", leadId)
    .select(
      "potential_lead_id,status,research_notes,reviewed_at,rejected_at,verified_at",
    )
    .single();

  if (updateError) {
    return NextResponse.json(
      { success: false, message: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    action: parsed.data.action,
    lead: updatedLead,
  });
}
