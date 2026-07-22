import { canonicalUrl, SEO_SITE_NAME, SEO_SITE_URL } from "@/lib/seo/metadata";

type BreadcrumbItem = {
  name: string;
  path: string;
};

export function toJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO_SITE_NAME,
    url: SEO_SITE_URL,
    logo: canonicalUrl("/icon-512.png"),
  };
}

export function getWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_SITE_NAME,
    url: SEO_SITE_URL,
    inLanguage: ["en-US", "es-ES"],
  };
}

export function getSoftwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SEO_SITE_NAME,
    url: SEO_SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Commercial cleaning CRM and janitorial management software with AI tools for dispatch, quoting, and operations.",
    inLanguage: ["en-US", "es-ES"],
    brand: {
      "@type": "Brand",
      name: SEO_SITE_NAME,
    },
  };
}

export function getBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}
