import "server-only";

import { getAiProvider } from "@/lib/ai/provider";

export type OutsourcingLikelihood = "High" | "Medium" | "Low" | "Unknown";

export type OrganizationType =
  | "public sector"
  | "education"
  | "healthcare"
  | "office"
  | "industrial"
  | "retail"
  | "multifamily"
  | "nonprofit"
  | "unknown";

export type ResearchBusinessInput = {
  businessName: string;
  city?: string | null;
  state?: string | null;
  website?: string | null;
};

export type ResearchSource = {
  name: string;
  url: string | null;
  note: string | null;
};

export type ResearchBusinessResult = {
  businessName: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  propertyType: string;
  estimatedBuildingSize: string | null;
  estimatedMonthlyContractValue: number | null;
  contractValueConfidence: number;
  outsourcingLikelihood: OutsourcingLikelihood;
  organizationType: OrganizationType;
  opportunitySummary: string;
  recommendedNextStep: string;
  procurementNotes: string | null;
  estimatedContractValue: number;
  aiConfidence: number;
  aiReasoning: string;
  researchNotes: string;
  sources: ResearchSource[];
  needsManualVerification: boolean;
  uncertainFields: string[];
  provider: string;
  model: string;
  isMock: boolean;
};

type AiResearchPayload = {
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  property_type?: string | null;
  estimated_building_size?: string | null;
  estimated_monthly_contract_value?: number | string | null;
  contract_value_confidence?: number | string | null;
  outsourcing_likelihood?: string | null;
  organization_type?: string | null;
  opportunity_summary?: string | null;
  recommended_next_step?: string | null;
  procurement_notes?: string | null;
  estimated_contract_value?: number | string | null;
  confidence?: number | string | null;
  reasoning?: string | null;
  notes?: string | null;
  sources?: Array<{
    name?: string | null;
    url?: string | null;
    note?: string | null;
  }>;
  uncertain_fields?: string[];
};

const LOW_CONFIDENCE_THRESHOLD = 65;
const LOW_VALUE_CONFIDENCE_THRESHOLD = 60;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const next = normalizeWhitespace(value);
  return next.length > 0 ? next : null;
}

function normalizeWebsite(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(
      normalized.startsWith("http") ? normalized : `https://${normalized}`,
    );
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(
      /\/$/,
      "",
    );
  } catch {
    return normalized;
  }
}

function normalizePhone(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/[^0-9]/g, "");
  if (digits.length < 10) {
    return null;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return `+${digits}`;
}

function normalizeEmail(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized || !normalized.includes("@")) {
    return null;
  }

  return normalized.toLowerCase();
}

function normalizeCurrencyNumberOrNull(value: unknown) {
  if (value == null) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      return null;
    }

    if (
      /(unknown|needs estimate|not available|n\/a|unverified|undetermined)/.test(
        normalized,
      )
    ) {
      return null;
    }

    const parsed = Number(normalized.replace(/[$,\s]/g, ""));
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }

  return null;
}

function normalizeConfidence(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(clamp(value, 0, 100));
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[\s%]/g, ""));
    if (Number.isFinite(parsed)) {
      return Math.round(clamp(parsed, 0, 100));
    }
  }

  return 35;
}

function parseAiJson(content: string): AiResearchPayload | null {
  const trimmed = content.trim();
  const candidates = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    candidates.unshift(fenced[1].trim());
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as AiResearchPayload;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

function normalizeOutsourcingLikelihood(value: unknown): OutsourcingLikelihood {
  const normalized = normalizeOptionalString(value)?.toLowerCase();

  if (normalized === "high") return "High";
  if (normalized === "medium") return "Medium";
  if (normalized === "low") return "Low";
  return "Unknown";
}

function normalizeOrganizationType(value: unknown): OrganizationType {
  const normalized = normalizeOptionalString(value)?.toLowerCase();

  if (normalized === "public sector") return "public sector";
  if (normalized === "education") return "education";
  if (normalized === "healthcare") return "healthcare";
  if (normalized === "office") return "office";
  if (normalized === "industrial") return "industrial";
  if (normalized === "retail") return "retail";
  if (normalized === "multifamily") return "multifamily";
  if (normalized === "nonprofit") return "nonprofit";
  return "unknown";
}

function inferOrganizationTypeFromProperty(
  propertyType: string,
): OrganizationType {
  const normalized = propertyType.toLowerCase();

  if (/(school|district|academy|college|university)/.test(normalized)) {
    return "education";
  }

  if (/(municipal|government|city|county|public)/.test(normalized)) {
    return "public sector";
  }

  if (/(hospital|clinic|medical)/.test(normalized)) {
    return "healthcare";
  }

  if (/(office|corporate|hq)/.test(normalized)) {
    return "office";
  }

  if (/(warehouse|industrial|plant|manufacturing)/.test(normalized)) {
    return "industrial";
  }

  if (/(retail|store|shopping)/.test(normalized)) {
    return "retail";
  }

  if (/(apartment|multifamily|condo|residential complex)/.test(normalized)) {
    return "multifamily";
  }

  if (/(nonprofit|foundation|charity)/.test(normalized)) {
    return "nonprofit";
  }

  return "unknown";
}

function isPublicProcurementLikely(orgType: OrganizationType) {
  return orgType === "public sector" || orgType === "education";
}

function defaultNextStep(orgType: OrganizationType): string {
  if (orgType === "education" || orgType === "public sector") {
    return "Check public bid portal";
  }

  if (orgType === "multifamily") {
    return "Research property manager";
  }

  if (orgType === "industrial") {
    return "Confirm outsourced janitorial provider";
  }

  return "Call facilities department";
}

function buildOpportunitySummary(input: {
  businessName: string;
  organizationType: OrganizationType;
  propertyType: string;
  outsourcingLikelihood: OutsourcingLikelihood;
  uncertainFields: string[];
  procurementNotes: string | null;
}) {
  const reasons: string[] = [];
  const unverified = input.uncertainFields.length
    ? `Unverified: ${input.uncertainFields.join(", ")}.`
    : "No major data gaps identified from public sources.";

  if (input.organizationType === "office") {
    reasons.push(
      `${input.businessName} appears to operate office space that typically requires recurring janitorial coverage.`,
    );
  } else if (input.organizationType === "education") {
    reasons.push(
      `${input.businessName} appears to be an education organization with likely recurring day porter and sanitation needs.`,
    );
  } else if (input.organizationType === "public sector") {
    reasons.push(
      `${input.businessName} appears to be a public-sector entity where cleaning demand is often procured through formal bid cycles.`,
    );
  } else {
    reasons.push(
      `${input.businessName} may need commercial cleaning based on its ${input.propertyType.toLowerCase()} profile.`,
    );
  }

  reasons.push(`Outsourcing likelihood: ${input.outsourcingLikelihood}.`);
  reasons.push(unverified);

  if (input.procurementNotes) {
    reasons.push(input.procurementNotes);
  }

  return reasons.join(" ").slice(0, 2000);
}

function normalizeSources(value: AiResearchPayload["sources"]) {
  if (!Array.isArray(value)) {
    return [] as ResearchSource[];
  }

  return value
    .map((source) => ({
      name: normalizeOptionalString(source?.name),
      url: normalizeOptionalString(source?.url),
      note: normalizeOptionalString(source?.note),
    }))
    .filter((source) => source.name || source.url)
    .map((source) => ({
      name: source.name ?? source.url ?? "Public source",
      url: source.url,
      note: source.note,
    }));
}

function normalizeUncertainFields(
  value: AiResearchPayload["uncertain_fields"],
) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  const fields = value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));

  return [...new Set(fields)];
}

function buildFallbackResult(
  input: ResearchBusinessInput,
): ResearchBusinessResult {
  const city = normalizeOptionalString(input.city);
  const state = normalizeOptionalString(input.state);
  const website = normalizeWebsite(input.website);

  return {
    businessName: normalizeWhitespace(input.businessName),
    website,
    phone: null,
    email: null,
    address: null,
    city,
    state,
    zipCode: null,
    propertyType: "Commercial Facility (Unverified)",
    estimatedBuildingSize: null,
    estimatedMonthlyContractValue: null,
    contractValueConfidence: 0,
    outsourcingLikelihood: "Unknown",
    organizationType: "unknown",
    opportunitySummary:
      "Possible commercial cleaning opportunity, but key qualification details are still unverified.",
    recommendedNextStep: "Research property manager",
    procurementNotes: null,
    estimatedContractValue: 0,
    aiConfidence: 30,
    aiReasoning:
      "Automated enrichment did not return structured public data. Manual verification is required before verification.",
    researchNotes:
      "Research response was unstructured or unavailable. Contact details were left blank to avoid fabricated data.",
    sources: [],
    needsManualVerification: true,
    uncertainFields: [
      "phone",
      "email",
      "address",
      "property_type",
      "estimated_contract_value",
    ],
    provider: "unknown",
    model: "unknown",
    isMock: true,
  };
}

function buildNotes(input: {
  aiNotes: string | null;
  uncertainFields: string[];
  sources: ResearchSource[];
  provider: string;
  model: string;
}) {
  const lines: string[] = [];

  if (input.aiNotes) {
    lines.push(input.aiNotes);
  }

  if (input.uncertainFields.length > 0) {
    lines.push(`Uncertain fields: ${input.uncertainFields.join(", ")}.`);
  }

  if (input.sources.length > 0) {
    const sourceSummary = input.sources
      .map((source) => {
        const parts = [source.name];
        if (source.url) parts.push(source.url);
        if (source.note) parts.push(source.note);
        return parts.join(" | ");
      })
      .join("; ");

    lines.push(`Public sources: ${sourceSummary}`);
  } else {
    lines.push(
      "No reliable public sources were returned by automated research.",
    );
  }

  lines.push(`AI provider: ${input.provider}. Model: ${input.model}.`);

  return lines.join("\n\n").slice(0, 16000);
}

export async function researchBusiness(
  input: ResearchBusinessInput,
): Promise<ResearchBusinessResult> {
  const provider = getAiProvider();
  const normalizedBusinessName = normalizeWhitespace(input.businessName);

  try {
    const generated = await provider.generate({
      employeeSlug: "lead-researcher",
      systemPrompt: [
        "You are ServiceOS Lead Researcher.",
        "Use only publicly available business information.",
        "Never fabricate phone, email, address, website, property type, square footage, contract value, or decision-maker details.",
        "Estimate values only if supported by explicit public evidence or clearly labeled heuristic assumptions.",
        "If estimate support is weak, return null for estimate fields and set confidence appropriately.",
        "Classify organization_type as one of: public sector, education, healthcare, office, industrial, retail, multifamily, nonprofit, unknown.",
        "Set outsourcing_likelihood as High, Medium, Low, or Unknown.",
        "For schools, municipalities, and public agencies, provide procurement or bid guidance.",
        "When uncertain, return null for unknown fields and list them in uncertain_fields.",
        "Return strict JSON only.",
      ].join(" "),
      userPrompt: [
        "Research this business and return structured enrichment data.",
        "Include source names or URLs for every non-empty contact/location field.",
        "If no reliable public source exists, leave field null.",
      ].join(" "),
      context: {
        business_name: normalizedBusinessName,
        city: normalizeOptionalString(input.city) ?? "",
        state: normalizeOptionalString(input.state) ?? "",
        website_hint: normalizeOptionalString(input.website) ?? "",
        required_json_shape: JSON.stringify({
          website: "string|null",
          phone: "string|null",
          email: "string|null",
          address: "string|null",
          city: "string|null",
          state: "string|null",
          zip_code: "string|null",
          property_type: "string|null",
          estimated_building_size: "string|null",
          estimated_monthly_contract_value: "number|null",
          contract_value_confidence: "number 0-100",
          outsourcing_likelihood: "High|Medium|Low|Unknown",
          organization_type:
            "public sector|education|healthcare|office|industrial|retail|multifamily|nonprofit|unknown",
          opportunity_summary:
            "plain-language reasoning: why cleaning likely, what remains unverified, and procurement context",
          recommended_next_step:
            "Call facilities department|Check public bid portal|Confirm outsourced janitorial provider|Research property manager|Request vendor registration requirements",
          procurement_notes: "string|null",
          estimated_contract_value: "number|null",
          confidence: "number 0-100",
          reasoning: "string",
          notes: "string|null",
          uncertain_fields: ["string"],
          sources: [
            {
              name: "string",
              url: "string|null",
              note: "string|null",
            },
          ],
        }),
      },
    });

    const parsed = parseAiJson(generated.content);
    if (!parsed) {
      const fallback = buildFallbackResult(input);
      return {
        ...fallback,
        provider: generated.provider,
        model: generated.model,
        isMock: generated.isMock,
      };
    }

    const sources = normalizeSources(parsed.sources);
    const uncertainFields = normalizeUncertainFields(parsed.uncertain_fields);
    const confidence = normalizeConfidence(parsed.confidence);
    const propertyType =
      normalizeOptionalString(parsed.property_type) ??
      "Commercial Facility (Unverified)";
    const organizationType =
      normalizeOrganizationType(parsed.organization_type) ??
      inferOrganizationTypeFromProperty(propertyType);
    const outsourcingLikelihood = normalizeOutsourcingLikelihood(
      parsed.outsourcing_likelihood,
    );
    const estimatedMonthlyContractValue = normalizeCurrencyNumberOrNull(
      parsed.estimated_monthly_contract_value,
    );
    const contractValueConfidence = normalizeConfidence(
      parsed.contract_value_confidence,
    );
    const monthlyEstimateSupported =
      estimatedMonthlyContractValue != null &&
      contractValueConfidence >= LOW_VALUE_CONFIDENCE_THRESHOLD;
    const procurementNotesFromAi = normalizeOptionalString(
      parsed.procurement_notes,
    );
    const procurementNotes = isPublicProcurementLikely(organizationType)
      ? (procurementNotesFromAi ??
        "Public-sector procurement likely applies. Review district or municipal bid portal and vendor registration requirements before outreach.")
      : procurementNotesFromAi;
    const recommendedNextStep =
      normalizeOptionalString(parsed.recommended_next_step) ??
      defaultNextStep(organizationType);

    const result: ResearchBusinessResult = {
      businessName: normalizedBusinessName,
      website: normalizeWebsite(parsed.website ?? input.website),
      phone: normalizePhone(parsed.phone),
      email: normalizeEmail(parsed.email),
      address: normalizeOptionalString(parsed.address),
      city:
        normalizeOptionalString(parsed.city) ??
        normalizeOptionalString(input.city),
      state:
        normalizeOptionalString(parsed.state) ??
        normalizeOptionalString(input.state),
      zipCode: normalizeOptionalString(parsed.zip_code),
      propertyType,
      estimatedBuildingSize: normalizeOptionalString(
        parsed.estimated_building_size,
      ),
      estimatedMonthlyContractValue: monthlyEstimateSupported
        ? estimatedMonthlyContractValue
        : null,
      contractValueConfidence,
      outsourcingLikelihood,
      organizationType,
      opportunitySummary:
        normalizeOptionalString(parsed.opportunity_summary) ??
        "Potential commercial cleaning opportunity identified, pending manual verification.",
      recommendedNextStep,
      procurementNotes,
      estimatedContractValue:
        monthlyEstimateSupported && estimatedMonthlyContractValue != null
          ? estimatedMonthlyContractValue * 12
          : 0,
      aiConfidence: confidence,
      aiReasoning:
        normalizeOptionalString(parsed.reasoning) ??
        "AI research completed with partial public data.",
      researchNotes: "",
      sources,
      needsManualVerification: confidence < LOW_CONFIDENCE_THRESHOLD,
      uncertainFields,
      provider: generated.provider,
      model: generated.model,
      isMock: generated.isMock,
    };

    const missingCriticalFields = [
      ["phone", result.phone],
      ["email", result.email],
      ["address", result.address],
      ["estimated_building_size", result.estimatedBuildingSize],
      [
        "estimated_monthly_contract_value",
        result.estimatedMonthlyContractValue,
      ],
    ]
      .filter(([, value]) => !value)
      .map(([field]) => field)
      .filter((field): field is string => Boolean(field));

    for (const field of missingCriticalFields) {
      if (!result.uncertainFields.includes(field)) {
        result.uncertainFields.push(field);
      }
    }

    if (result.sources.length === 0) {
      result.needsManualVerification = true;
    }

    if (!monthlyEstimateSupported) {
      result.needsManualVerification = true;
      if (
        !result.uncertainFields.includes("estimated_monthly_contract_value")
      ) {
        result.uncertainFields.push("estimated_monthly_contract_value");
      }
    }

    if (result.uncertainFields.length > 0) {
      result.needsManualVerification = true;
    }

    result.opportunitySummary = buildOpportunitySummary({
      businessName: result.businessName,
      organizationType: result.organizationType,
      propertyType: result.propertyType,
      outsourcingLikelihood: result.outsourcingLikelihood,
      uncertainFields: result.uncertainFields,
      procurementNotes: result.procurementNotes,
    });

    result.researchNotes = buildNotes({
      aiNotes: normalizeOptionalString(parsed.notes),
      uncertainFields: result.uncertainFields,
      sources: result.sources,
      provider: result.provider,
      model: result.model,
    });

    return result;
  } catch {
    return buildFallbackResult(input);
  }
}
