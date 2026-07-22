import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoCityMarketplacePage } from "@/components/seo-city-marketplace-page";
import {
  buildMarketplaceCityPath,
  getMarketplaceCityPage,
  getMarketplaceCityStaticParams,
} from "@/lib/seo/marketplace-city-pages";
import { buildMarketingMetadata } from "@/lib/seo/metadata";

type CityMarketplacePageProps = {
  params: Promise<{
    state: string;
    city: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getMarketplaceCityStaticParams();
}

export async function generateMetadata({
  params,
}: CityMarketplacePageProps): Promise<Metadata> {
  const { state, city } = await params;
  const cityPage = getMarketplaceCityPage(state, city);

  if (!cityPage) {
    return {
      title: "Commercial Cleaning Leads City Page Not Found | Service OS",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const path = buildMarketplaceCityPath(cityPage.stateSlug, cityPage.citySlug);

  return buildMarketingMetadata({
    title: `${cityPage.cityName}, ${cityPage.stateCode} Commercial Cleaning Leads | Service OS`,
    description: cityPage.heroDescription,
    path,
    keywords: cityPage.keywords,
  });
}

export default async function CityMarketplacePage({
  params,
}: CityMarketplacePageProps) {
  const { state, city } = await params;
  const cityPage = getMarketplaceCityPage(state, city);

  if (!cityPage) {
    notFound();
  }

  return <SeoCityMarketplacePage cityPage={cityPage} />;
}
