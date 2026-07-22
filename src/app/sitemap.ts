import type { MetadataRoute } from "next";
import { getAllBlogArticles } from "@/lib/blog/articles";
import { ALL_LANDING_PAGES } from "@/lib/seo/landing-pages";
import { getMarketplaceCityPagePaths } from "@/lib/seo/marketplace-city-pages";
import { SEO_SITE_URL } from "@/lib/seo/metadata";

const siteUrl = SEO_SITE_URL;

function toAbsoluteUrl(path: string) {
  if (path === "/") return siteUrl;
  return `${siteUrl}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const blogArticles = getAllBlogArticles();

  const coreMarketingPages: MetadataRoute.Sitemap = [
    {
      url: toAbsoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: toAbsoluteUrl("/pricing"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: toAbsoluteUrl("/contact"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: toAbsoluteUrl("/blog"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: toAbsoluteUrl("/demo"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: toAbsoluteUrl("/demo/tour"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: toAbsoluteUrl("/demo/admin"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: toAbsoluteUrl("/demo/customer"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: toAbsoluteUrl("/demo/employee"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: toAbsoluteUrl("/explore"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: toAbsoluteUrl("/website-builder"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: toAbsoluteUrl("/request-quote"),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = blogArticles.map((article) => ({
    url: toAbsoluteUrl(`/blog/${article.slug}`),
    lastModified: new Date(article.publishedOn),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const landingPages: MetadataRoute.Sitemap = ALL_LANDING_PAGES.map((page) => ({
    url: toAbsoluteUrl(page.path),
    lastModified,
    changeFrequency: "weekly",
    priority: page.path.includes("leads") ? 0.78 : 0.8,
  }));

  const cityMarketplacePages: MetadataRoute.Sitemap =
    getMarketplaceCityPagePaths().map((path) => ({
      url: toAbsoluteUrl(path),
      lastModified,
      changeFrequency: "weekly",
      priority: 0.76,
    }));

  return [
    ...coreMarketingPages,
    ...landingPages,
    ...cityMarketplacePages,
    ...blogPages,
  ];
}
