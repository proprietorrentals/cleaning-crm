import "server-only";

export type ProviderResearchSource = {
  name: string;
  url: string | null;
  note: string | null;
};

export type ProviderUsageEntry = {
  provider: "tavily" | "firecrawl";
  configured: boolean;
  attempted: boolean;
  success: boolean;
  resultCount: number;
  message: string;
};

type TavilySearchResult = {
  title?: string;
  url?: string;
  content?: string;
};

type TavilySearchResponse = {
  results?: TavilySearchResult[];
};

type FirecrawlScrapeResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      siteName?: string;
    };
  };
};

export type ProviderPipelineResult = {
  officialWebsite: string | null;
  sources: ProviderResearchSource[];
  evidenceBlocks: string[];
  usage: ProviderUsageEntry[];
};

export type DiscoverySourceType =
  | "official_website"
  | "google_business_profile"
  | "local_directory"
  | "other";

export type DiscoveryFacilityLikelihood = "high" | "medium" | "low";

export type DiscoveryProviderCandidate = {
  businessName: string;
  website: string | null;
  sourceName: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceSnippet: string | null;
  sourceType: DiscoverySourceType;
  city: string;
  state: string;
  category: string;
  leadEligibilityScore: number;
  rejectionReason: string | null;
  facilityLikelihood: DiscoveryFacilityLikelihood;
  hasPhysicalAddressEvidence: boolean;
  hasCategoryEvidence: boolean;
};

export type DiscoveryCandidatesResult = {
  query: string;
  accepted: DiscoveryProviderCandidate[];
  rejected: DiscoveryProviderCandidate[];
};

type CategoryIntent = {
  queryTerms: string[];
  categoryKeywords: string[];
  facilityKeywords: string[];
};

type DiscoveryEligibilityAssessment = {
  score: number;
  rejected: boolean;
  rejectionReason: string | null;
  facilityLikelihood: DiscoveryFacilityLikelihood;
  hasPhysicalAddressEvidence: boolean;
  hasCategoryEvidence: boolean;
};

const DIRECTORY_DOMAIN_HINTS = [
  "yelp.com",
  "yellowpages.com",
  "mapquest.com",
  "manta.com",
  "chamberofcommerce.com",
  "bbb.org",
  "foursquare.com",
  "angi.com",
  "thumbtack.com",
] as const;

const MARKETPLACE_DOMAIN_HINTS = [
  "amazon.",
  "ebay.",
  "etsy.",
  "walmart.",
  "aliexpress.",
  "bestbuy.",
  "target.",
] as const;

const SOFTWARE_PRODUCT_TERMS = [
  "software",
  "saas",
  "crm",
  "app",
  "template",
  "plugin",
  "download",
  "tool",
  "platform",
  "microsoft office",
  "office 365",
  "google workspace",
  "hubspot",
  "salesforce",
] as const;

const BLOCKED_PATH_PATTERNS = [
  "/product",
  "/products",
  "/category",
  "/categories",
  "/blog",
  "/docs",
  "/documentation",
  "/kb/",
  "/help",
  "/support",
  "/shop",
  "/store",
  "/listing",
  "/listings",
  "/marketplace",
  "/collections",
  "/dp/",
] as const;

const ADDRESS_HINT_PATTERN =
  /\b\d{1,6}\s+[a-z0-9\-\s]{2,40}\s(?:st|street|ave|avenue|rd|road|dr|drive|blvd|boulevard|ln|lane|way|ct|court|pkwy|parkway|pl|place|suite|ste|unit)\b/i;
const ZIP_PATTERN = /\b\d{5}(?:-\d{4})?\b/;

const CATEGORY_INTENTS: Record<string, CategoryIntent> = {
  Office: {
    queryTerms: [
      "office building",
      "corporate office",
      "business park",
      "property management office",
      "facility management",
      "janitorial contract",
    ],
    categoryKeywords: [
      "office",
      "corporate",
      "business park",
      "headquarters",
      "administrative",
      "property management",
    ],
    facilityKeywords: ["building", "suite", "facility", "campus", "floor"],
  },
  Medical: {
    queryTerms: [
      "medical clinic",
      "doctor office",
      "urgent care center",
      "outpatient center",
      "healthcare facility",
      "medical office building",
    ],
    categoryKeywords: [
      "clinic",
      "medical",
      "healthcare",
      "hospital",
      "urgent care",
      "physician",
      "dental",
    ],
    facilityKeywords: [
      "patient",
      "facility",
      "campus",
      "medical office",
      "center",
    ],
  },
  Warehouse: {
    queryTerms: [
      "warehouse facility",
      "distribution center",
      "logistics warehouse",
      "freight terminal",
      "storage facility",
      "industrial park warehouse",
    ],
    categoryKeywords: [
      "warehouse",
      "distribution",
      "logistics",
      "freight",
      "fulfillment",
      "storage",
    ],
    facilityKeywords: [
      "dock",
      "industrial",
      "facility",
      "square feet",
      "operations center",
    ],
  },
  Manufacturing: {
    queryTerms: [
      "manufacturing plant",
      "factory facility",
      "production facility",
      "industrial manufacturer",
      "assembly plant",
      "processing facility",
    ],
    categoryKeywords: [
      "manufacturing",
      "factory",
      "plant",
      "production",
      "industrial",
    ],
    facilityKeywords: ["plant", "facility", "operations", "industrial", "site"],
  },
  Industrial: {
    queryTerms: [
      "industrial facility",
      "industrial park",
      "industrial service center",
      "industrial operations",
      "processing plant",
    ],
    categoryKeywords: ["industrial", "plant", "facility", "operations"],
    facilityKeywords: ["facility", "plant", "building", "operations center"],
  },
  Apartment: {
    queryTerms: [
      "apartment complex",
      "multifamily property",
      "property management apartment",
      "residential community office",
    ],
    categoryKeywords: [
      "apartment",
      "multifamily",
      "residential",
      "leasing office",
    ],
    facilityKeywords: [
      "complex",
      "community",
      "leasing",
      "property",
      "building",
    ],
  },
  School: {
    queryTerms: [
      "school campus",
      "private school",
      "charter school",
      "education facility",
      "district administration building",
    ],
    categoryKeywords: ["school", "academy", "education", "campus", "district"],
    facilityKeywords: ["campus", "building", "facility", "administration"],
  },
  Church: {
    queryTerms: [
      "church campus",
      "worship center",
      "religious facility",
      "parish office",
    ],
    categoryKeywords: ["church", "parish", "ministry", "worship", "cathedral"],
    facilityKeywords: ["campus", "facility", "building", "sanctuary"],
  },
  Retail: {
    queryTerms: [
      "retail store location",
      "shopping center tenant",
      "brick and mortar retail",
      "storefront business",
    ],
    categoryKeywords: ["retail", "store", "shopping", "storefront", "merchant"],
    facilityKeywords: ["location", "store", "unit", "center", "suite"],
  },
  Hotel: {
    queryTerms: [
      "hotel property",
      "hospitality facility",
      "extended stay hotel",
      "lodging location",
    ],
    categoryKeywords: ["hotel", "inn", "suites", "resort", "hospitality"],
    facilityKeywords: ["property", "rooms", "facility", "guest", "location"],
  },
  Government: {
    queryTerms: [
      "municipal building",
      "government office",
      "public works facility",
      "county administration center",
    ],
    categoryKeywords: ["government", "city", "county", "municipal", "public"],
    facilityKeywords: [
      "building",
      "office",
      "facility",
      "center",
      "department",
    ],
  },
  Nonprofit: {
    queryTerms: [
      "nonprofit organization office",
      "community center nonprofit",
      "charitable organization headquarters",
      "foundation office",
    ],
    categoryKeywords: [
      "nonprofit",
      "foundation",
      "charity",
      "community",
      "organization",
    ],
    facilityKeywords: [
      "office",
      "facility",
      "center",
      "headquarters",
      "campus",
    ],
  },
};

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

function normalizeUrl(value: string | null | undefined) {
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

function normalizeBusinessNameFromTitle(title: string) {
  return normalizeWhitespace(title)
    .replace(/\|.*$/, "")
    .replace(/-\s*(Home|Official Site|Contact|Locations).*$/i, "")
    .replace(/\s*\(Official.*\)$/i, "")
    .trim();
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

function lowerText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function containsAny(text: string, needles: readonly string[]) {
  return needles.some((needle) => text.includes(needle.toLowerCase()));
}

function sourceTypeFromUrl(url: string | null): DiscoverySourceType {
  if (!url) {
    return "other";
  }

  const domain = domainFromUrl(url);
  if (!domain) {
    return "other";
  }

  if (domain.includes("google.") && url.toLowerCase().includes("/maps")) {
    return "google_business_profile";
  }

  if (DIRECTORY_DOMAIN_HINTS.some((hint) => domain.includes(hint))) {
    return "local_directory";
  }

  if (
    !domain.includes("wikipedia.org") &&
    !domain.includes("facebook.com") &&
    !domain.includes("linkedin.com")
  ) {
    return "official_website";
  }

  return "other";
}

function blockedByPath(url: string | null) {
  if (!url) {
    return false;
  }

  const lowered = url.toLowerCase();
  return BLOCKED_PATH_PATTERNS.some((pattern) => lowered.includes(pattern));
}

function isMarketplaceUrl(url: string | null) {
  const domain = domainFromUrl(url);
  if (!domain) {
    return false;
  }

  return MARKETPLACE_DOMAIN_HINTS.some((hint) => domain.includes(hint));
}

function categoryIntentFor(category: string): CategoryIntent {
  return (
    CATEGORY_INTENTS[category] ?? {
      queryTerms: [
        `${category.toLowerCase()} facility`,
        `${category.toLowerCase()} business location`,
        `${category.toLowerCase()} commercial property`,
      ],
      categoryKeywords: [category.toLowerCase(), "facility", "commercial"],
      facilityKeywords: ["facility", "building", "location", "operations"],
    }
  );
}

export function buildDiscoverySearchIntent(params: {
  category: string;
  city: string;
  state: string;
  zipCode?: string | null;
}) {
  const intent = categoryIntentFor(params.category);

  return [
    intent.queryTerms.join(" OR "),
    params.city,
    params.state,
    params.zipCode ?? "",
    "official website",
    "google maps",
    "local business directory",
    "physical address",
    "commercial location",
    "-software -saas -app -blog -documentation -product -marketplace -amazon",
  ]
    .filter(Boolean)
    .join(" ");
}

export function assessDiscoveryLeadEligibility(input: {
  businessName: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceSnippet: string | null;
  category: string;
  city: string;
  state: string;
}): DiscoveryEligibilityAssessment {
  const intent = categoryIntentFor(input.category);
  const sourceType = sourceTypeFromUrl(input.sourceUrl);

  const normalizedName = normalizeOptionalString(input.businessName) ?? "";
  const lowered = lowerText([
    normalizedName,
    input.sourceTitle,
    input.sourceSnippet,
    input.sourceUrl,
  ]);

  const hasOrganizationName = normalizedName.length >= 3;
  const hasCategoryEvidence = containsAny(lowered, intent.categoryKeywords);
  const hasFacilityEvidence = containsAny(lowered, intent.facilityKeywords);
  const hasAddressEvidence =
    ADDRESS_HINT_PATTERN.test(lowered) ||
    ZIP_PATTERN.test(lowered) ||
    (containsAny(lowered, [
      input.city.toLowerCase(),
      input.state.toLowerCase(),
    ]) &&
      containsAny(lowered, ["address", "suite", "ste", "unit", "location"]));

  const softwareSignals = containsAny(lowered, SOFTWARE_PRODUCT_TERMS);
  const marketplaceSignal = isMarketplaceUrl(input.sourceUrl);
  const blockedPathSignal = blockedByPath(input.sourceUrl);

  const hardReject = softwareSignals || marketplaceSignal || blockedPathSignal;

  let score = 0;

  if (hasOrganizationName) {
    score += 20;
  }

  if (sourceType === "official_website") {
    score += 25;
  } else if (sourceType === "google_business_profile") {
    score += 20;
  } else if (sourceType === "local_directory") {
    score += 16;
  } else {
    score += 8;
  }

  if (hasAddressEvidence) {
    score += 25;
  }

  if (hasCategoryEvidence) {
    score += 15;
  }

  if (hasFacilityEvidence) {
    score += 15;
  }

  if (softwareSignals) {
    score -= 45;
  }

  if (marketplaceSignal) {
    score -= 45;
  }

  if (blockedPathSignal) {
    score -= 25;
  }

  score = Math.max(0, Math.min(100, score));

  const facilityLikelihood: DiscoveryFacilityLikelihood = hasFacilityEvidence
    ? hasAddressEvidence
      ? "high"
      : "medium"
    : "low";

  let rejectionReason: string | null = null;

  if (softwareSignals) {
    rejectionReason = "Rejected: software/product result";
  } else if (marketplaceSignal) {
    rejectionReason = "Rejected: marketplace or e-commerce listing";
  } else if (blockedPathSignal) {
    rejectionReason = "Rejected: product/category/blog/documentation page";
  } else if (!hasOrganizationName) {
    rejectionReason = "Rejected: missing organization name";
  } else if (!hasCategoryEvidence) {
    rejectionReason = "Rejected: missing business category evidence";
  } else if (!hasFacilityEvidence) {
    rejectionReason = "Rejected: low facility likelihood";
  } else if (!hasAddressEvidence) {
    rejectionReason = "Rejected: missing physical address evidence";
  } else if (score < 65) {
    rejectionReason = "Rejected: lead eligibility score below threshold";
  }

  const rejected = hardReject || rejectionReason !== null;

  return {
    score,
    rejected,
    rejectionReason,
    facilityLikelihood,
    hasPhysicalAddressEvidence: hasAddressEvidence,
    hasCategoryEvidence,
  };
}

function pickOfficialWebsiteFromResults(params: {
  businessName: string;
  results: TavilySearchResult[];
}) {
  const nameTokens = params.businessName
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 4);

  for (const result of params.results) {
    if (!result.url || !result.title) {
      continue;
    }

    const title = result.title.toLowerCase();
    const normalizedUrl = normalizeUrl(result.url);
    if (!normalizedUrl) {
      continue;
    }

    if (sourceTypeFromUrl(normalizedUrl) !== "official_website") {
      continue;
    }

    if (nameTokens.some((token) => title.includes(token))) {
      return normalizedUrl;
    }
  }

  const firstOfficial = params.results
    .map((result) => normalizeUrl(result.url ?? null))
    .find((url) => sourceTypeFromUrl(url) === "official_website");

  if (firstOfficial) {
    return firstOfficial;
  }

  const firstUrl = params.results.find((result) => Boolean(result.url))?.url;
  return normalizeUrl(firstUrl ?? null);
}

async function tavilySearch(params: { query: string; maxResults: number }) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      attempted: false,
      success: false,
      message: "Tavily API key not configured.",
      results: [] as TavilySearchResult[],
    };
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: params.query,
        max_results: Math.max(1, Math.min(params.maxResults, 25)),
        search_depth: "advanced",
        include_answer: false,
        include_images: false,
      }),
    });

    if (!response.ok) {
      return {
        configured: true,
        attempted: true,
        success: false,
        message: `Tavily request failed with status ${response.status}.`,
        results: [] as TavilySearchResult[],
      };
    }

    const payload = (await response.json()) as TavilySearchResponse;
    const results = (payload.results ?? []).filter((entry) =>
      Boolean(entry.url || entry.title || entry.content),
    );

    return {
      configured: true,
      attempted: true,
      success: true,
      message: `Tavily returned ${results.length} result(s).`,
      results,
    };
  } catch {
    return {
      configured: true,
      attempted: true,
      success: false,
      message: "Tavily request failed due to network or provider error.",
      results: [] as TavilySearchResult[],
    };
  }
}

async function scrapeFirecrawlPage(url: string) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      attempted: false,
      success: false,
      message: "Firecrawl API key not configured.",
      url,
      title: null as string | null,
      markdown: null as string | null,
    };
  }

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      return {
        configured: true,
        attempted: true,
        success: false,
        message: `Firecrawl scrape failed with status ${response.status}.`,
        url,
        title: null as string | null,
        markdown: null as string | null,
      };
    }

    const payload = (await response.json()) as FirecrawlScrapeResponse;
    const title =
      payload.data?.metadata?.siteName ?? payload.data?.metadata?.title ?? null;
    const markdown = normalizeOptionalString(payload.data?.markdown ?? null);

    return {
      configured: true,
      attempted: true,
      success: true,
      message: "Firecrawl scrape completed.",
      url,
      title,
      markdown,
    };
  } catch {
    return {
      configured: true,
      attempted: true,
      success: false,
      message: "Firecrawl request failed due to network or provider error.",
      url,
      title: null as string | null,
      markdown: null as string | null,
    };
  }
}

export async function runBusinessResearchProviders(input: {
  businessName: string;
  city?: string | null;
  state?: string | null;
  websiteHint?: string | null;
  tavilyResultLimit?: number;
  firecrawlPageLimit?: number;
}): Promise<ProviderPipelineResult> {
  const tavilyLimit = Math.max(1, Math.min(input.tavilyResultLimit ?? 8, 12));
  const firecrawlLimit = Math.max(
    1,
    Math.min(input.firecrawlPageLimit ?? 3, 5),
  );

  const sources: ProviderResearchSource[] = [];
  const evidenceBlocks: string[] = [];
  const usage: ProviderUsageEntry[] = [];

  const tavilyQuery = [
    input.businessName,
    input.city ?? "",
    input.state ?? "",
    "official website phone email address facility",
  ]
    .filter(Boolean)
    .join(" ");

  const tavily = await tavilySearch({
    query: tavilyQuery,
    maxResults: tavilyLimit,
  });
  usage.push({
    provider: "tavily",
    configured: tavily.configured,
    attempted: tavily.attempted,
    success: tavily.success,
    resultCount: tavily.results.length,
    message: tavily.message,
  });

  for (const result of tavily.results.slice(0, tavilyLimit)) {
    const sourceUrl = normalizeUrl(result.url ?? null);
    const sourceName = normalizeOptionalString(result.title) ?? "Tavily result";
    const excerpt =
      normalizeOptionalString(result.content)?.slice(0, 700) ?? null;

    sources.push({
      name: sourceName,
      url: sourceUrl,
      note: excerpt ? `Tavily snippet: ${excerpt}` : "Tavily search result",
    });

    if (excerpt) {
      evidenceBlocks.push(
        `${sourceName} (${sourceUrl ?? "no-url"}): ${excerpt}`,
      );
    }
  }

  let officialWebsite = normalizeUrl(input.websiteHint);
  if (!officialWebsite && tavily.results.length > 0) {
    officialWebsite = pickOfficialWebsiteFromResults({
      businessName: input.businessName,
      results: tavily.results,
    });
  }

  const pageCandidates = new Set<string>();
  if (officialWebsite) {
    pageCandidates.add(officialWebsite);

    const baseDomain = domainFromUrl(officialWebsite);
    if (baseDomain) {
      pageCandidates.add(`https://${baseDomain}/about`);
      pageCandidates.add(`https://${baseDomain}/contact`);
      pageCandidates.add(`https://${baseDomain}/locations`);
    }
  }

  let firecrawlSuccessCount = 0;
  let firecrawlAttemptCount = 0;
  let firecrawlFailureMessage: string | null = null;

  for (const pageUrl of [...pageCandidates].slice(0, firecrawlLimit)) {
    const scraped = await scrapeFirecrawlPage(pageUrl);

    if (scraped.attempted) {
      firecrawlAttemptCount += 1;
    }

    if (!scraped.success) {
      firecrawlFailureMessage = scraped.message;
      continue;
    }

    firecrawlSuccessCount += 1;

    const pageTitle = normalizeOptionalString(scraped.title) ?? "Website page";
    const pageMarkdown =
      normalizeOptionalString(scraped.markdown)?.slice(0, 1200) ?? null;

    sources.push({
      name: `Firecrawl: ${pageTitle}`,
      url: scraped.url,
      note: pageMarkdown
        ? `Page excerpt: ${pageMarkdown}`
        : "Scraped website page",
    });

    if (pageMarkdown) {
      evidenceBlocks.push(`${pageTitle} (${scraped.url}): ${pageMarkdown}`);
    }
  }

  const firecrawlConfigured = Boolean(process.env.FIRECRAWL_API_KEY);
  usage.push({
    provider: "firecrawl",
    configured: firecrawlConfigured,
    attempted: firecrawlAttemptCount > 0,
    success: firecrawlSuccessCount > 0,
    resultCount: firecrawlSuccessCount,
    message:
      firecrawlAttemptCount === 0
        ? firecrawlConfigured
          ? "Firecrawl configured but no trusted website was available to scrape."
          : "Firecrawl API key not configured."
        : firecrawlSuccessCount > 0
          ? `Firecrawl scraped ${firecrawlSuccessCount} page(s).`
          : (firecrawlFailureMessage ?? "Firecrawl scraping failed."),
  });

  return {
    officialWebsite,
    sources,
    evidenceBlocks,
    usage,
  };
}

export async function discoverCandidatesWithProviders(params: {
  city: string;
  state: string;
  zipCode?: string | null;
  category: string;
  limit: number;
}): Promise<DiscoveryCandidatesResult> {
  const query = buildDiscoverySearchIntent({
    category: params.category,
    city: params.city,
    state: params.state,
    zipCode: params.zipCode,
  });

  const search = await tavilySearch({
    query,
    maxResults: Math.min(24, Math.max(8, params.limit * 3)),
  });

  if (!search.success || search.results.length === 0) {
    return {
      query,
      accepted: [],
      rejected: [],
    };
  }

  const baseCandidates = search.results
    .map((result): DiscoveryProviderCandidate | null => {
      const sourceUrl = normalizeUrl(result.url ?? null);
      const sourceTitle = normalizeOptionalString(result.title);
      const sourceSnippet =
        normalizeOptionalString(result.content)?.slice(0, 900) ?? null;
      const sourceType = sourceTypeFromUrl(sourceUrl);

      const provisionalName =
        normalizeOptionalString(
          sourceTitle ? normalizeBusinessNameFromTitle(sourceTitle) : null,
        ) ?? "";

      if (!provisionalName) {
        return null;
      }

      const assessment = assessDiscoveryLeadEligibility({
        businessName: provisionalName,
        sourceUrl,
        sourceTitle,
        sourceSnippet,
        category: params.category,
        city: params.city,
        state: params.state,
      });

      return {
        businessName: provisionalName,
        website: sourceUrl,
        sourceName: "Tavily",
        sourceUrl,
        sourceTitle,
        sourceSnippet,
        sourceType,
        city: params.city,
        state: params.state,
        category: params.category,
        leadEligibilityScore: assessment.score,
        rejectionReason: assessment.rejectionReason,
        facilityLikelihood: assessment.facilityLikelihood,
        hasPhysicalAddressEvidence: assessment.hasPhysicalAddressEvidence,
        hasCategoryEvidence: assessment.hasCategoryEvidence,
      };
    })
    .filter((candidate): candidate is DiscoveryProviderCandidate =>
      Boolean(candidate),
    );

  const preSorted = [...baseCandidates].sort((a, b) => {
    if (a.sourceType !== b.sourceType) {
      const sourcePriority: Record<DiscoverySourceType, number> = {
        official_website: 4,
        google_business_profile: 3,
        local_directory: 2,
        other: 1,
      };
      return sourcePriority[b.sourceType] - sourcePriority[a.sourceType];
    }

    return b.leadEligibilityScore - a.leadEligibilityScore;
  });

  const enrichLimit = Math.min(preSorted.length, 8);

  const enriched = await Promise.all(
    preSorted.slice(0, enrichLimit).map(async (candidate) => {
      if (!candidate.sourceUrl) {
        return candidate;
      }

      if (
        candidate.sourceType === "other" &&
        candidate.leadEligibilityScore < 40
      ) {
        return candidate;
      }

      const scraped = await scrapeFirecrawlPage(candidate.sourceUrl);
      if (!scraped.success) {
        return candidate;
      }

      const scrapedTitle = normalizeOptionalString(scraped.title);
      const scrapedSnippet =
        normalizeOptionalString(scraped.markdown)?.slice(0, 1200) ?? null;

      const normalizedScrapedName = scrapedTitle
        ? normalizeBusinessNameFromTitle(scrapedTitle)
        : candidate.businessName;

      const nextBusinessName =
        normalizeOptionalString(normalizedScrapedName) ??
        candidate.businessName;

      const nextSnippet = [candidate.sourceSnippet, scrapedSnippet]
        .filter(Boolean)
        .join(" ");

      const assessment = assessDiscoveryLeadEligibility({
        businessName: nextBusinessName,
        sourceUrl: candidate.sourceUrl,
        sourceTitle: scrapedTitle ?? candidate.sourceTitle,
        sourceSnippet: nextSnippet,
        category: candidate.category,
        city: candidate.city,
        state: candidate.state,
      });

      return {
        ...candidate,
        businessName: nextBusinessName,
        sourceName: "Firecrawl",
        sourceTitle: scrapedTitle ?? candidate.sourceTitle,
        sourceSnippet: nextSnippet || candidate.sourceSnippet,
        leadEligibilityScore: assessment.score,
        rejectionReason: assessment.rejectionReason,
        facilityLikelihood: assessment.facilityLikelihood,
        hasPhysicalAddressEvidence: assessment.hasPhysicalAddressEvidence,
        hasCategoryEvidence: assessment.hasCategoryEvidence,
      };
    }),
  );

  const combined = [...enriched, ...preSorted.slice(enrichLimit)];

  const deduped = new Map<string, DiscoveryProviderCandidate>();
  for (const candidate of combined) {
    const key = `${candidate.businessName.toLowerCase()}|${candidate.city.toLowerCase()}|${candidate.state.toLowerCase()}`;
    const existing = deduped.get(key);

    if (
      !existing ||
      existing.leadEligibilityScore < candidate.leadEligibilityScore
    ) {
      deduped.set(key, candidate);
    }
  }

  const finalCandidates = [...deduped.values()].sort(
    (a, b) => b.leadEligibilityScore - a.leadEligibilityScore,
  );

  const accepted = finalCandidates
    .filter((candidate) => candidate.rejectionReason === null)
    .slice(0, params.limit);

  const rejected = finalCandidates
    .filter((candidate) => candidate.rejectionReason !== null)
    .slice(0, Math.max(params.limit * 2, 8));

  return {
    query,
    accepted,
    rejected,
  };
}
