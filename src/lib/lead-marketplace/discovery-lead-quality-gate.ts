import "server-only";

import type { DiscoveryCategory } from "@/lib/lead-marketplace/discovery-engine";

export type DiscoveryEligibilityStatus =
  | "Eligible"
  | "Needs Research"
  | "Rejected";

export type DiscoveryRejectionReason =
  | "wrong_market"
  | "no_physical_location"
  | "missing_business_name"
  | "social_profile_only"
  | "directory_listing_only"
  | "product_or_software_page"
  | "property_listing_without_owner"
  | "category_mismatch"
  | "duplicate"
  | "weak_source_evidence";

export type DiscoveryGateCandidateInput = {
  businessName: string;
  website: string | null;
  sourceName: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceSnippet: string | null;
  category: DiscoveryCategory;
  city: string;
  state: string;
  zipCode: string | null;
};

export type DiscoveryQualityGateResult = {
  eligibilityStatus: DiscoveryEligibilityStatus;
  leadEligibilityScore: number;
  rejectionReason: DiscoveryRejectionReason | null;
  locationMatch: boolean;
  facilityConfirmed: boolean;
  officialSourceConfirmed: boolean;
  categoryMatch: boolean;
  normalizedBusinessName: string;
  website: string | null;
  evidence: string[];
};

type PropertyListingResolution = {
  resolvedOrganization: string | null;
  evidence: string[];
};

const SOCIAL_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "linkedin.com",
  "tiktok.com",
  "youtube.com",
] as const;

const DIRECTORY_DOMAINS = [
  "yelp.com",
  "yellowpages.com",
  "manta.com",
  "chamberofcommerce.com",
  "bbb.org",
  "mapquest.com",
] as const;

const GENERIC_PAGE_PATTERNS = [
  /\b(home|homepage)\b/i,
  /\b(contact|contact us)\b/i,
  /\blocations?\b/i,
];

const PRODUCT_PATTERNS = [
  /\b(software|saas|app|platform|plugin|crm|product)\b/i,
  /\b(ecommerce|e-commerce|shop|store|listing|sku)\b/i,
  /\/products?\//i,
] as const;

const BLOG_DOC_PATTERNS = [
  /\b(blog|documentation|docs|knowledge base|kb|help center)\b/i,
  /\/(blog|docs|documentation|kb|help)\//i,
] as const;

const DIRECTORY_PATTERNS = [
  /\b(directory|yellow pages|yelp|manta|chamber of commerce|bbb)\b/i,
] as const;

const PROPERTY_LISTING_PATTERNS = [
  /\b(for rent|for lease|leasing|available space|sq\.? ?ft|square feet)\b/i,
  /\b(loopnet|crexi|commercial real estate|property listing|warehouse for rent)\b/i,
] as const;

const CATEGORY_KEYWORDS: Record<DiscoveryCategory, string[]> = {
  Office: ["office", "corporate", "business park", "headquarters"],
  Medical: ["medical", "clinic", "hospital", "health", "urgent care"],
  Industrial: ["industrial", "plant", "facility", "operations"],
  Manufacturing: ["manufacturing", "factory", "production", "plant"],
  Warehouse: ["warehouse", "distribution", "logistics", "fulfillment"],
  Apartment: ["apartment", "multifamily", "leasing", "property management"],
  School: ["school", "district", "academy", "campus"],
  Church: ["church", "parish", "worship", "ministry"],
  Retail: ["retail", "store", "shopping", "merchant"],
  Hotel: ["hotel", "inn", "hospitality", "resort"],
  Government: ["government", "city", "county", "municipal", "public"],
  Nonprofit: ["nonprofit", "charity", "foundation", "community organization"],
};

const CLEANING_NEED_KEYWORDS = [
  "facility",
  "building",
  "office",
  "campus",
  "operations",
  "tenants",
  "patients",
  "rooms",
  "warehouse",
  "property",
] as const;

const ADDRESS_PATTERN =
  /\b\d{1,6}\s+[a-z0-9\-\s]{2,40}\s(?:st|street|ave|avenue|rd|road|dr|drive|blvd|boulevard|ln|lane|way|ct|court|pkwy|parkway|pl|place|suite|ste|unit)\b/i;
const ZIP_PATTERN = /\b\d{5}(?:-\d{4})?\b/;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeName(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return normalizeWhitespace(value)
    .replace(/\|.*$/, "")
    .replace(/-\s*(home|official site|contact|locations?).*$/i, "")
    .trim();
}

function normalizedText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function domainFromUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(
      value.startsWith("http") ? value : `https://${value}`,
    );
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function hasAnyPattern(text: string, patterns: readonly RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function hasKeyword(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isOfficialSource(sourceUrl: string | null) {
  const domain = domainFromUrl(sourceUrl);
  if (!domain) {
    return false;
  }

  if (SOCIAL_DOMAINS.some((item) => domain.includes(item))) {
    return false;
  }

  if (DIRECTORY_DOMAINS.some((item) => domain.includes(item))) {
    return false;
  }

  return true;
}

function isSocialOnly(sourceUrl: string | null, sourceTitle: string | null) {
  const domain = domainFromUrl(sourceUrl);
  if (!domain) {
    return false;
  }

  if (SOCIAL_DOMAINS.some((item) => domain.includes(item))) {
    return true;
  }

  const title = (sourceTitle ?? "").toLowerCase();
  return /instagram|facebook|linkedin|x \(|twitter/.test(title);
}

function hasLocationMatch(input: DiscoveryGateCandidateInput, text: string) {
  const cityMatch = text.includes(input.city.toLowerCase());
  const stateMatch = text.includes(input.state.toLowerCase());
  const zipMatch = input.zipCode
    ? text.includes(input.zipCode.toLowerCase())
    : false;

  return (cityMatch && stateMatch) || zipMatch;
}

function hasPhysicalLocationEvidence(text: string) {
  return ADDRESS_PATTERN.test(text) || ZIP_PATTERN.test(text);
}

function hasCategoryMatch(category: DiscoveryCategory, text: string) {
  const keywords = CATEGORY_KEYWORDS[category] ?? [];
  return hasKeyword(text, keywords);
}

function hasPlausibleCleaningNeed(text: string) {
  return hasKeyword(text, CLEANING_NEED_KEYWORDS);
}

async function lookupPropertyResponsibleOrganization(params: {
  candidate: DiscoveryGateCandidateInput;
}): Promise<PropertyListingResolution> {
  const sourceText = normalizedText([
    params.candidate.sourceTitle,
    params.candidate.sourceSnippet,
  ]);

  const directMatch = sourceText.match(
    /(property manager|managed by|owner|owned by|leasing company|leasing agent)\s*[:-]?\s*([-a-z0-9&'., ]{3,80})/i,
  );

  if (directMatch?.[2]) {
    return {
      resolvedOrganization: normalizeName(directMatch[2]),
      evidence: [
        `Resolved from listing snippet: ${normalizeWhitespace(directMatch[0])}`,
      ],
    };
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return {
      resolvedOrganization: null,
      evidence: ["Tavily unavailable for property-owner enrichment."],
    };
  }

  const query = [
    params.candidate.businessName,
    params.candidate.city,
    params.candidate.state,
    "property owner OR property manager OR leasing company",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 4,
        search_depth: "advanced",
        include_answer: false,
      }),
    });

    if (!response.ok) {
      return {
        resolvedOrganization: null,
        evidence: [
          `Property-owner enrichment search failed with ${response.status}.`,
        ],
      };
    }

    const payload = (await response.json()) as {
      results?: Array<{ title?: string; content?: string }>;
    };

    const text = normalizedText(
      (payload.results ?? []).flatMap((row) => [
        row.title ?? "",
        row.content ?? "",
      ]),
    );

    const ownerMatch = text.match(
      /(property manager|managed by|owner|owned by|leasing company|leasing agent)\s*[:-]?\s*([-a-z0-9&'., ]{3,80})/i,
    );

    if (!ownerMatch?.[2]) {
      return {
        resolvedOrganization: null,
        evidence: [
          "Additional property-owner enrichment found no responsible organization.",
        ],
      };
    }

    return {
      resolvedOrganization: normalizeName(ownerMatch[2]),
      evidence: [
        `Additional enrichment identified responsible organization: ${normalizeWhitespace(ownerMatch[0])}`,
      ],
    };
  } catch {
    return {
      resolvedOrganization: null,
      evidence: ["Property-owner enrichment failed due to provider error."],
    };
  }
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function runDiscoveryLeadQualityGate(
  input: DiscoveryGateCandidateInput,
): Promise<DiscoveryQualityGateResult> {
  const normalizedBusinessName = normalizeName(input.businessName);
  const text = normalizedText([
    normalizedBusinessName,
    input.sourceTitle,
    input.sourceSnippet,
    input.sourceUrl,
  ]);

  const socialOnly = isSocialOnly(input.sourceUrl, input.sourceTitle);
  const genericPage = hasAnyPattern(text, GENERIC_PAGE_PATTERNS);
  const productOrSoftware =
    hasAnyPattern(text, PRODUCT_PATTERNS) ||
    hasAnyPattern(text, BLOG_DOC_PATTERNS);
  const directorySignal = hasAnyPattern(text, DIRECTORY_PATTERNS);
  const propertyListing = hasAnyPattern(text, PROPERTY_LISTING_PATTERNS);

  const locationMatch = hasLocationMatch(input, text);
  const facilityConfirmed = hasPhysicalLocationEvidence(text);
  const categoryMatch = hasCategoryMatch(input.category, text);
  const officialSourceConfirmed = isOfficialSource(input.sourceUrl);
  const plausibleCleaningNeed = hasPlausibleCleaningNeed(text);

  let candidateName = normalizedBusinessName;
  const evidence: string[] = [];

  if (propertyListing) {
    const resolution = await lookupPropertyResponsibleOrganization({
      candidate: input,
    });

    evidence.push(...resolution.evidence);

    if (resolution.resolvedOrganization) {
      candidateName = resolution.resolvedOrganization;
    } else {
      return {
        eligibilityStatus: "Rejected",
        leadEligibilityScore: 0,
        rejectionReason: "property_listing_without_owner",
        locationMatch,
        facilityConfirmed,
        officialSourceConfirmed,
        categoryMatch,
        normalizedBusinessName: candidateName,
        website: input.website,
        evidence,
      };
    }
  }

  if (!candidateName && !facilityConfirmed) {
    return {
      eligibilityStatus: "Rejected",
      leadEligibilityScore: 0,
      rejectionReason: "missing_business_name",
      locationMatch,
      facilityConfirmed,
      officialSourceConfirmed,
      categoryMatch,
      normalizedBusinessName: candidateName,
      website: input.website,
      evidence,
    };
  }

  if (socialOnly) {
    return {
      eligibilityStatus: "Rejected",
      leadEligibilityScore: 0,
      rejectionReason: "social_profile_only",
      locationMatch,
      facilityConfirmed,
      officialSourceConfirmed,
      categoryMatch,
      normalizedBusinessName: candidateName,
      website: input.website,
      evidence,
    };
  }

  if (genericPage) {
    return {
      eligibilityStatus: "Rejected",
      leadEligibilityScore: 18,
      rejectionReason: "weak_source_evidence",
      locationMatch,
      facilityConfirmed,
      officialSourceConfirmed,
      categoryMatch,
      normalizedBusinessName: candidateName,
      website: input.website,
      evidence,
    };
  }

  if (productOrSoftware) {
    return {
      eligibilityStatus: "Rejected",
      leadEligibilityScore: 0,
      rejectionReason: "product_or_software_page",
      locationMatch,
      facilityConfirmed,
      officialSourceConfirmed,
      categoryMatch,
      normalizedBusinessName: candidateName,
      website: input.website,
      evidence,
    };
  }

  if (!locationMatch) {
    return {
      eligibilityStatus: "Rejected",
      leadEligibilityScore: 12,
      rejectionReason: "wrong_market",
      locationMatch,
      facilityConfirmed,
      officialSourceConfirmed,
      categoryMatch,
      normalizedBusinessName: candidateName,
      website: input.website,
      evidence,
    };
  }

  if (!facilityConfirmed) {
    return {
      eligibilityStatus: "Rejected",
      leadEligibilityScore: 20,
      rejectionReason: "no_physical_location",
      locationMatch,
      facilityConfirmed,
      officialSourceConfirmed,
      categoryMatch,
      normalizedBusinessName: candidateName,
      website: input.website,
      evidence,
    };
  }

  if (!categoryMatch) {
    return {
      eligibilityStatus: "Rejected",
      leadEligibilityScore: 28,
      rejectionReason: "category_mismatch",
      locationMatch,
      facilityConfirmed,
      officialSourceConfirmed,
      categoryMatch,
      normalizedBusinessName: candidateName,
      website: input.website,
      evidence,
    };
  }

  if (directorySignal && (!candidateName || !officialSourceConfirmed)) {
    return {
      eligibilityStatus: "Rejected",
      leadEligibilityScore: 22,
      rejectionReason: "directory_listing_only",
      locationMatch,
      facilityConfirmed,
      officialSourceConfirmed,
      categoryMatch,
      normalizedBusinessName: candidateName,
      website: input.website,
      evidence,
    };
  }

  if (!officialSourceConfirmed) {
    return {
      eligibilityStatus: "Needs Research",
      leadEligibilityScore: 45,
      rejectionReason: null,
      locationMatch,
      facilityConfirmed,
      officialSourceConfirmed,
      categoryMatch,
      normalizedBusinessName: candidateName,
      website: input.website,
      evidence,
    };
  }

  let score = 0;
  score += candidateName ? 15 : 0;
  score += locationMatch ? 20 : 0;
  score += facilityConfirmed ? 20 : 0;
  score += categoryMatch ? 15 : 0;
  score += plausibleCleaningNeed ? 15 : 0;
  score += officialSourceConfirmed ? 15 : 0;

  if (!officialSourceConfirmed) {
    score -= 10;
  }

  if (directorySignal) {
    score -= 8;
  }

  const leadEligibilityScore = clampScore(score);

  if (leadEligibilityScore < 40) {
    return {
      eligibilityStatus: "Rejected",
      leadEligibilityScore,
      rejectionReason: "weak_source_evidence",
      locationMatch,
      facilityConfirmed,
      officialSourceConfirmed,
      categoryMatch,
      normalizedBusinessName: candidateName,
      website: input.website,
      evidence,
    };
  }

  if (leadEligibilityScore < 65 || !plausibleCleaningNeed) {
    return {
      eligibilityStatus: "Needs Research",
      leadEligibilityScore,
      rejectionReason: null,
      locationMatch,
      facilityConfirmed,
      officialSourceConfirmed,
      categoryMatch,
      normalizedBusinessName: candidateName,
      website: input.website,
      evidence,
    };
  }

  return {
    eligibilityStatus: "Eligible",
    leadEligibilityScore,
    rejectionReason: null,
    locationMatch,
    facilityConfirmed,
    officialSourceConfirmed,
    categoryMatch,
    normalizedBusinessName: candidateName,
    website: input.website,
    evidence,
  };
}
