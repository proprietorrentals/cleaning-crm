import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DemoTourPage } from "@/components/demo/demo-tour-page";
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

  return buildMarketingMetadata({
    title: copy.tourTitle,
    description: copy.tourDescription,
    path: "/demo/tour",
    locale: lang,
    includeLanguageAlternates: true,
    keywords: [
      "commercial cleaning workflow demo",
      "cleaning CRM guided tour",
      "janitorial management software",
    ],
  });
}

export default function DemoTourRoute() {
  return (
    <>
      <SeoJsonLd
        payload={getBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Demo", path: "/demo" },
          { name: "Tour", path: "/demo/tour" },
        ])}
      />
      <DemoTourPage />
    </>
  );
}
