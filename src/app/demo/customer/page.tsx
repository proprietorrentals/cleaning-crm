import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DemoCustomerPage } from "@/components/demo/demo-customer-page";
import {
  type DemoMetadataLanguage,
  demoMetadataByLanguage,
} from "@/lib/demo-metadata";
import { buildMarketingMetadata, resolveSeoLocale } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = resolveSeoLocale(
    cookieStore.get("serviceos_lang")?.value,
  ) as DemoMetadataLanguage;
  const copy = demoMetadataByLanguage[lang];

  return buildMarketingMetadata({
    title: copy.customerTitle,
    description: copy.customerDescription,
    path: "/demo/customer",
    locale: lang,
    includeLanguageAlternates: true,
    keywords: ["customer portal demo", "commercial cleaning software demo"],
  });
}

export default function DemoCustomerRoute() {
  return <DemoCustomerPage />;
}
