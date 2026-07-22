import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DemoAdminPage } from "@/components/demo/demo-admin-page";
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
    title: copy.adminTitle,
    description: copy.adminDescription,
    path: "/demo/admin",
    locale: lang,
    includeLanguageAlternates: true,
    keywords: ["cleaning CRM owner demo", "janitorial management dashboard"],
  });
}

export default function DemoAdminRoute() {
  return <DemoAdminPage />;
}
