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

export type DiscoveryProviderCandidate = {
  businessName: string;
  website: string | null;
  sourceName: string;
  sourceUrl: string | null;
  city: string;
  state: string;
  category: string;
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
    if (nameTokens.some((token) => title.includes(token))) {
      return normalizeUrl(result.url);
    }
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
        max_results: Math.max(1, Math.min(params.maxResults, 20)),
        search_depth: "basic",
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
}): Promise<DiscoveryProviderCandidate[]> {
  const search = await tavilySearch({
    query: [
      `${params.category} businesses`,
      params.city,
      params.state,
      params.zipCode ?? "",
      "commercial property facilities",
    ]
      .filter(Boolean)
      .join(" "),
    maxResults: Math.min(20, Math.max(1, params.limit * 2)),
  });

  if (!search.success || search.results.length === 0) {
    return [];
  }

  const candidates: DiscoveryProviderCandidate[] = [];

  for (const result of search.results) {
    const rawTitle = normalizeOptionalString(result.title) ?? "";
    const businessName = rawTitle
      ? normalizeBusinessNameFromTitle(rawTitle)
      : "";

    if (!businessName || businessName.length < 2) {
      continue;
    }

    candidates.push({
      businessName,
      website: normalizeUrl(result.url ?? null),
      sourceName: "Tavily",
      sourceUrl: normalizeUrl(result.url ?? null),
      city: params.city,
      state: params.state,
      category: params.category,
    });
  }

  const enriched = await Promise.all(
    candidates.slice(0, 6).map(async (candidate) => {
      if (!candidate.website) {
        return candidate;
      }

      const scraped = await scrapeFirecrawlPage(candidate.website);
      if (!scraped.success || !scraped.title) {
        return candidate;
      }

      return {
        ...candidate,
        businessName: normalizeBusinessNameFromTitle(scraped.title),
        sourceName: "Firecrawl",
      };
    }),
  );

  return [...enriched, ...candidates.slice(6)].slice(0, params.limit);
}
