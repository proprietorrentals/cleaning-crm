import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DemoEmployeePage } from "@/components/demo/demo-employee-page";
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
    title: copy.employeeTitle,
    description: copy.employeeDescription,
    path: "/demo/employee",
    locale: lang,
    includeLanguageAlternates: true,
    keywords: ["cleaning team mobile workflow", "janitorial employee app demo"],
  });
}

export default function DemoEmployeeRoute() {
  return <DemoEmployeePage />;
}
