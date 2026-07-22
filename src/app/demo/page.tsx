import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DemoLandingPage } from "@/components/demo/demo-landing-page";
import { SeoJsonLd } from "@/components/seo-json-ld";
import {
  type DemoMetadataLanguage,
  demoMetadataByLanguage,
} from "@/lib/demo-metadata";
import { buildMarketingMetadata, resolveSeoLocale } from "@/lib/seo/metadata";
import { getBreadcrumbJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = resolveSeoLocale(
    cookieStore.get("serviceos_lang")?.value,
  ) as DemoMetadataLanguage;
  const copy = demoMetadataByLanguage[lang];
  const baseMetadata = buildMarketingMetadata({
    title: copy.landingTitle,
    description: copy.landingDescription,
    path: "/demo",
    locale: lang,
    includeLanguageAlternates: true,
    keywords: [
      "commercial cleaning business software",
      "cleaning CRM demo",
      "AI tools for cleaning companies",
    ],
  });

  return {
    ...baseMetadata,
    openGraph: {
      ...baseMetadata.openGraph,
      title: copy.landingOgTitle,
      description: copy.landingOgDescription,
    },
  };
}

export default function DemoPage() {
  return (
    <>
      <SeoJsonLd
        payload={getBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Demo", path: "/demo" },
        ])}
      />
      <DemoLandingPage />
    </>
  );
}
