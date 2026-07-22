import type { MetadataRoute } from "next";
import { SEO_SITE_URL } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/pricing",
        "/contact",
        "/blog",
        "/blog/",
        "/demo",
        "/demo/",
        "/explore",
        "/website-builder",
        "/request-quote",
      ],
      disallow: [
        "/admin",
        "/admin-login",
        "/super-admin",
        "/customer-portal",
        "/employee",
        "/employee-login",
        "/employee-portal",
        "/api",
        "/login",
        "/signup",
        "/payment-success",
        "/payment-cancelled",
        "/request-quote/confirmation",
        "/customers",
        "/quotes",
        "/quote-pricing",
        "/jobs",
        "/employees",
        "/invoices",
        "/schedule",
        "/reports",
        "/settings",
        "/tasks",
        "/operations-center",
        "/leads",
        "/marketplace",
      ],
    },
    sitemap: `${SEO_SITE_URL}/sitemap.xml`,
    host: SEO_SITE_URL,
  };
}
