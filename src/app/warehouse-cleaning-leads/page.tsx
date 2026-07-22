import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/seo-landing-page";
import { requireLandingPageByPath } from "@/lib/seo/landing-pages";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

const config = requireLandingPageByPath("/warehouse-cleaning-leads");

export const metadata: Metadata = buildMarketingMetadata({
  title: config.title,
  description: config.description,
  path: config.path,
  keywords: config.keywords,
});

export default function WarehouseCleaningLeadsPage() {
  return <SeoLandingPage config={config} />;
}
