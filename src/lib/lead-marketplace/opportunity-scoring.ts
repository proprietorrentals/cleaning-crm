import "server-only";

export const OPPORTUNITY_SCORE_VERSION = "phase3a-v1";

export type OpportunityGrade = "A+" | "A" | "B" | "C" | "D";

export type OpportunityScoreBreakdownItem = {
  factor: string;
  points: number;
  evidence: string[];
  penalty?: string;
};

export type OpportunityScoreBreakdown = {
  version: string;
  scoredAt: string;
  total: number;
  grade: OpportunityGrade;
  ineligible: boolean;
  items: OpportunityScoreBreakdownItem[];
};

export type OpportunityScoringInput = {
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  propertyType: string | null;
  estimatedBuildingSize: string | null;
  outsourcingLikelihood: "High" | "Medium" | "Low" | "Unknown";
  organizationType:
    | "public sector"
    | "education"
    | "healthcare"
    | "office"
    | "industrial"
    | "retail"
    | "multifamily"
    | "nonprofit"
    | "unknown";
  procurementNotes: string | null;
  recommendedNextStep: string | null;
  opportunitySummary: string | null;
  researchNotes: string | null;
  sources: Array<{
    name: string;
    url: string | null;
    note: string | null;
  }> | null;
  needsManualVerification: boolean | null;
  uncertainFields: string[];
  contractValueConfidence: number;
};

export type OpportunityScoringResult = {
  opportunityScore: number;
  opportunityGrade: OpportunityGrade;
  scoreVersion: string;
  scoredAt: string;
  scoreBreakdown: OpportunityScoreBreakdown;
};

const TRUSTED_SOURCE_KEYWORDS = [
  "official",
  "google maps",
  "bing maps",
  "yelp",
  "yellow pages",
  "chamber",
  "linkedin",
  "county",
  "city",
  "state",
  "school",
  "district",
  "hospital",
  "government",
  "osha",
  "sec",
  "bbb",
];

const INELIGIBLE_KEYWORDS = [
  "saas",
  "software",
  "app",
  "plugin",
  "template",
  "ecommerce",
  "e-commerce",
  "shopify",
  "amazon listing",
  "dropshipping",
  "digital product",
  "course",
  "online store",
  "product page",
  "marketplace app",
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function hasValue(value: string | null | undefined) {
  return normalizeText(value).length > 0;
}

function isKnownAddress(
  address: string | null,
  city: string | null,
  state: string | null,
) {
  const combined = `${normalizeText(address)} ${normalizeText(city)} ${normalizeText(state)}`;

  if (!combined.trim()) {
    return false;
  }

  return !/(unknown|needs manual verification|n\/a|not available)/.test(
    combined,
  );
}

function isValidWebsite(website: string | null) {
  if (!website) {
    return false;
  }

  const normalized = website.trim();
  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(
      normalized.startsWith("http") ? normalized : `https://${normalized}`,
    );
    return Boolean(parsed.hostname);
  } catch {
    return /\./.test(normalized);
  }
}

function isValidPhone(phone: string | null) {
  if (!phone) {
    return false;
  }

  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length >= 10;
}

function estimateBuildingSizePoints(value: string | null) {
  if (!value) {
    return 0;
  }

  const normalized = value.toLowerCase();
  const numericMatches = normalized.match(/[\d,.]+/g);

  if (numericMatches) {
    const numbers = numericMatches
      .map((match) => Number(match.replace(/,/g, "")))
      .filter((num) => Number.isFinite(num));

    if (numbers.length > 0) {
      const size = Math.max(...numbers);
      if (size >= 200000) return 15;
      if (size >= 100000) return 13;
      if (size >= 60000) return 11;
      if (size >= 30000) return 9;
      if (size >= 15000) return 7;
      if (size >= 8000) return 5;
      if (size >= 4000) return 3;
      return 1;
    }
  }

  if (
    /(campus|multi-building|tower|distribution center|plant|hospital|factory)/.test(
      normalized,
    )
  ) {
    return 9;
  }

  if (/(large|extensive|industrial)/.test(normalized)) {
    return 6;
  }

  return 2;
}

function industryPoints(input: OpportunityScoringInput) {
  const orgType = input.organizationType;

  if (orgType === "healthcare") return 20;
  if (orgType === "industrial") return 18;
  if (orgType === "multifamily") return 16;
  if (orgType === "office") return 15;
  if (orgType === "education") return 12;
  if (orgType === "retail") return 9;
  if (orgType === "nonprofit") return 8;

  const property = normalizeText(input.propertyType);
  if (/(hotel|hospitality)/.test(property)) return 8;
  if (/(church|faith)/.test(property)) return 7;
  if (/(warehouse|manufacturing|factory)/.test(property)) return 18;

  return 5;
}

function getGrade(score: number): OpportunityGrade {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

function hasTrustedSourceName(name: string) {
  return TRUSTED_SOURCE_KEYWORDS.some((token) => name.includes(token));
}

function hasMultipleLocationEvidence(input: OpportunityScoringInput) {
  const evidenceBlob = [
    input.opportunitySummary,
    input.researchNotes,
    input.procurementNotes,
    input.estimatedBuildingSize,
  ]
    .map((value) => normalizeText(value))
    .join(" ");

  return /(multiple locations|multi-location|several locations|campus|regional offices|nationwide locations|chain)/.test(
    evidenceBlob,
  );
}

function hasConflictingEvidence(input: OpportunityScoringInput) {
  const evidenceBlob = [
    input.opportunitySummary,
    input.researchNotes,
    input.recommendedNextStep,
    input.procurementNotes,
    ...input.uncertainFields,
  ]
    .map((value) => normalizeText(value))
    .join(" ");

  return /(conflict|inconsistent|contradict|unclear|unverified)/.test(
    evidenceBlob,
  );
}

function hasIneligibleEvidence(input: OpportunityScoringInput) {
  const text = [
    input.propertyType,
    input.opportunitySummary,
    input.researchNotes,
    input.recommendedNextStep,
    input.procurementNotes,
    ...(input.sources ?? []).map(
      (source) => `${source.name} ${source.note ?? ""}`,
    ),
  ]
    .map((value) => normalizeText(value))
    .join(" ");

  return INELIGIBLE_KEYWORDS.some((token) => text.includes(token));
}

function trustedSources(input: OpportunityScoringInput) {
  const sources = input.sources ?? [];
  return sources.filter((source) => {
    const name = normalizeText(source.name);
    const note = normalizeText(source.note);
    const url = normalizeText(source.url);
    return (
      hasTrustedSourceName(name) ||
      hasTrustedSourceName(note) ||
      /\.gov|\.edu|\.org/.test(url)
    );
  });
}

export function scoreCommercialCleaningOpportunity(
  input: OpportunityScoringInput,
): OpportunityScoringResult {
  const scoredAt = new Date().toISOString();

  if (hasIneligibleEvidence(input)) {
    const grade = getGrade(0);
    return {
      opportunityScore: 0,
      opportunityGrade: grade,
      scoreVersion: OPPORTUNITY_SCORE_VERSION,
      scoredAt,
      scoreBreakdown: {
        version: OPPORTUNITY_SCORE_VERSION,
        scoredAt,
        total: 0,
        grade,
        ineligible: true,
        items: [
          {
            factor: "Ineligible Result",
            points: 0,
            evidence: [
              "Evidence indicates product/software/e-commerce result instead of physical commercial cleaning opportunity.",
            ],
            penalty: "Ineligible lead type. Score forced to 0.",
          },
        ],
      },
    };
  }

  const items: OpportunityScoreBreakdownItem[] = [];
  let score = 0;

  const hasPhysicalFacility =
    isKnownAddress(input.address, input.city, input.state) &&
    hasValue(input.propertyType) &&
    input.organizationType !== "unknown";

  if (hasPhysicalFacility) {
    score += 20;
    items.push({
      factor: "Physical commercial facility confirmed",
      points: 20,
      evidence: [
        `Address: ${input.address ?? "N/A"}`,
        `Property type: ${input.propertyType ?? "unknown"}`,
      ],
    });
  } else {
    items.push({
      factor: "Physical commercial facility confirmed",
      points: 0,
      evidence: [
        "No reliable address/property evidence confirming a physical commercial facility.",
      ],
    });
  }

  if (hasMultipleLocationEvidence(input)) {
    score += 10;
    items.push({
      factor: "Multiple locations confirmed",
      points: 10,
      evidence: [
        "Research narrative includes multi-location/campus/chain indicators.",
      ],
    });
  }

  const buildingSizePoints = estimateBuildingSizePoints(
    input.estimatedBuildingSize,
  );
  if (buildingSizePoints > 0) {
    score += buildingSizePoints;
    items.push({
      factor: "Large-building estimate",
      points: buildingSizePoints,
      evidence: [
        input.estimatedBuildingSize ?? "Building size estimate present",
      ],
    });
  }

  const industryWeight = industryPoints(input);
  score += industryWeight;
  items.push({
    factor: "Industry fit",
    points: industryWeight,
    evidence: [
      `Organization type: ${input.organizationType}`,
      `Property type: ${input.propertyType ?? "unknown"}`,
    ],
  });

  const trusted = trustedSources(input);

  if (isValidWebsite(input.website)) {
    score += 10;
    items.push({
      factor: "Official website confirmed",
      points: 10,
      evidence: [input.website ?? ""],
    });
  }

  if (isKnownAddress(input.address, input.city, input.state)) {
    score += 5;
    items.push({
      factor: "Address verified",
      points: 5,
      evidence: [
        `${input.address ?? ""}, ${input.city ?? ""}, ${input.state ?? ""}`,
      ],
    });
  }

  if (isValidPhone(input.phone)) {
    score += 5;
    items.push({
      factor: "Phone verified",
      points: 5,
      evidence: [input.phone ?? ""],
    });
  }

  if (trusted.length >= 2) {
    score += 10;
    items.push({
      factor: "Multiple trusted sources",
      points: 10,
      evidence: trusted.slice(0, 4).map((source) => source.name),
    });
  }

  const outsourcingPoints =
    input.outsourcingLikelihood === "High"
      ? 15
      : input.outsourcingLikelihood === "Medium"
        ? 8
        : input.outsourcingLikelihood === "Low"
          ? 2
          : 0;

  score += outsourcingPoints;
  items.push({
    factor: "Outsourcing likelihood",
    points: outsourcingPoints,
    evidence: [`Likelihood: ${input.outsourcingLikelihood}`],
  });

  if (hasValue(input.procurementNotes)) {
    score += 5;
    items.push({
      factor: "Procurement path identified",
      points: 5,
      evidence: [input.procurementNotes as string],
    });
  }

  if (hasValue(input.recommendedNextStep)) {
    score += 5;
    items.push({
      factor: "Actionable next step identified",
      points: 5,
      evidence: [input.recommendedNextStep as string],
    });
  }

  if (input.needsManualVerification) {
    score -= 12;
    items.push({
      factor: "Manual verification required",
      points: -12,
      evidence: ["Research flagged manual verification requirement."],
      penalty: "Verification pending for key facts.",
    });
  }

  if (hasConflictingEvidence(input) || (input.sources ?? []).length <= 1) {
    score -= 10;
    items.push({
      factor: "Weak/conflicting sources",
      points: -10,
      evidence: [
        `Source count: ${(input.sources ?? []).length}`,
        `Uncertain fields: ${input.uncertainFields.join(", ") || "none"}`,
      ],
      penalty: "Source quality is weak or conflicting.",
    });
  }

  if (!isKnownAddress(input.address, input.city, input.state)) {
    score -= 12;
    items.push({
      factor: "Missing address",
      points: -12,
      evidence: ["No verifiable physical address was found."],
      penalty: "Address evidence missing.",
    });
  }

  const estimateClaimed = hasValue(input.estimatedBuildingSize);
  const estimateUnsupported =
    estimateClaimed &&
    (input.contractValueConfidence < 55 ||
      input.uncertainFields.includes("estimated_building_size"));

  if (estimateUnsupported) {
    score -= 8;
    items.push({
      factor: "Missing evidence for claimed estimate",
      points: -8,
      evidence: [
        `Building size estimate: ${input.estimatedBuildingSize ?? "N/A"}`,
        `Contract value confidence: ${input.contractValueConfidence}%`,
      ],
      penalty: "Estimate not sufficiently supported.",
    });
  }

  const clamped = clamp(Math.round(score), 0, 100);
  const grade = getGrade(clamped);

  return {
    opportunityScore: clamped,
    opportunityGrade: grade,
    scoreVersion: OPPORTUNITY_SCORE_VERSION,
    scoredAt,
    scoreBreakdown: {
      version: OPPORTUNITY_SCORE_VERSION,
      scoredAt,
      total: clamped,
      grade,
      ineligible: false,
      items,
    },
  };
}

export function buildOpportunityScoringInput(input: {
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  propertyType: string | null;
  estimatedBuildingSize: string | null;
  outsourcingLikelihood: "High" | "Medium" | "Low" | "Unknown";
  organizationType:
    | "public sector"
    | "education"
    | "healthcare"
    | "office"
    | "industrial"
    | "retail"
    | "multifamily"
    | "nonprofit"
    | "unknown";
  procurementNotes: string | null;
  recommendedNextStep: string | null;
  opportunitySummary: string | null;
  researchNotes: string | null;
  sources: Array<{
    name: string;
    url: string | null;
    note: string | null;
  }> | null;
  needsManualVerification: boolean | null;
  uncertainFields?: string[];
  contractValueConfidence: number;
}): OpportunityScoringInput {
  return {
    ...input,
    uncertainFields: input.uncertainFields ?? [],
  };
}
