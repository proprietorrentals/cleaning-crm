import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { WebsiteBuilderShell } from "@/components/website-builder-shell";
import { buildMarketingMetadata, resolveSeoLocale } from "@/lib/seo/metadata";
import { getBreadcrumbJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveSeoLocale(cookieStore.get("serviceos_lang")?.value);

  const copy =
    locale === "es"
      ? {
          title:
            "Creador de sitios Service OS | CRM para limpieza comercial y captacion de leads",
          description:
            "Crea paginas publicas para tu empresa de limpieza comercial y convierte solicitudes en oportunidades dentro de Service OS.",
        }
      : {
          title:
            "Service OS Website Builder | Cleaning CRM Website and Lead Capture",
          description:
            "Build public pages for your commercial cleaning business, capture qualified leads, and sync demand directly into your cleaning CRM.",
        };

  return buildMarketingMetadata({
    title: copy.title,
    description: copy.description,
    path: "/website-builder",
    locale,
    includeLanguageAlternates: true,
    keywords: [
      "commercial cleaning leads",
      "cleaning CRM website builder",
      "janitorial marketing software",
    ],
  });
}

export default function WebsiteBuilderPage() {
  return (
    <>
      <SeoJsonLd
        payload={getBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Website Builder", path: "/website-builder" },
        ])}
      />
      <WebsiteBuilderShell />
    </>
  );
}
