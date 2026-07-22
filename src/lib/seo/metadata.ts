import type { Metadata } from "next";

export const SEO_SITE_URL = "https://www.service-os.app";
export const SEO_SITE_NAME = "Service OS";
const DEFAULT_OG_IMAGE = "/icon-512.png";

export type SeoLocale = "en" | "es";

type MarketingMetadataInput = {
  title: string;
  description: string;
  path: string;
  locale?: SeoLocale;
  keywords?: string[];
  includeLanguageAlternates?: boolean;
};

function normalizePath(path: string) {
  if (!path || path === "/") return "/";
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

export function canonicalUrl(path: string) {
  const normalizedPath = normalizePath(path);
  return `${SEO_SITE_URL}${normalizedPath}`;
}

export function resolveSeoLocale(cookieValue?: string): SeoLocale {
  return cookieValue === "es" ? "es" : "en";
}

export function buildMarketingMetadata({
  title,
  description,
  path,
  locale = "en",
  keywords = [],
  includeLanguageAlternates = false,
}: MarketingMetadataInput): Metadata {
  const canonical = canonicalUrl(path);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
      ...(includeLanguageAlternates
        ? {
            languages: {
              "en-US": canonical,
              "es-ES": canonical,
            },
          }
        : {}),
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: SEO_SITE_NAME,
      title,
      description,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 512,
          height: 512,
          alt: "Service OS",
        },
      ],
      locale: locale === "es" ? "es_ES" : "en_US",
      alternateLocale: locale === "es" ? ["en_US"] : ["es_ES"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}
