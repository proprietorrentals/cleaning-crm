import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PricingPageContent } from "@/components/pricing-page-content";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { buildMarketingMetadata, resolveSeoLocale } from "@/lib/seo/metadata";
import { getBreadcrumbJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveSeoLocale(cookieStore.get("serviceos_lang")?.value);

  const copy =
    locale === "es"
      ? {
          title:
            "Precios de Service OS | Software de gestion para limpieza comercial",
          description:
            "Compara planes de Service OS para CRM de limpieza, gestion operativa y herramientas con IA para empresas de limpieza comercial.",
        }
      : {
          title:
            "Service OS Pricing | Commercial Cleaning CRM and AI Operations Software",
          description:
            "Compare Service OS plans for commercial cleaning CRM, janitorial management, AI-assisted workflows, and scalable lead-to-job operations.",
        };

  return buildMarketingMetadata({
    title: copy.title,
    description: copy.description,
    path: "/pricing",
    locale,
    includeLanguageAlternates: true,
    keywords: [
      "commercial cleaning business software",
      "cleaning CRM pricing",
      "janitorial management software",
      "AI tools for cleaning companies",
    ],
  });
}

export default function PricingPage() {
  return (
    <>
      <SeoJsonLd
        payload={getBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ])}
      />
      <PricingPageContent />
    </>
  );
}
