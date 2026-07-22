import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ContactPageContent } from "@/components/contact-page-content";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { buildMarketingMetadata, resolveSeoLocale } from "@/lib/seo/metadata";
import { getBreadcrumbJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveSeoLocale(cookieStore.get("serviceos_lang")?.value);

  const copy =
    locale === "es"
      ? {
          title: "Contacto Service OS | Solicita una demostracion",
          description:
            "Solicita una demo de Service OS para tu empresa de limpieza comercial y descubre como mejorar ventas, programacion y operaciones con IA.",
        }
      : {
          title:
            "Contact Service OS | Book a Commercial Cleaning Software Demo",
          description:
            "Talk with Service OS about cleaning CRM workflows, janitorial management software, AI automation, and commercial cleaning lead growth.",
        };

  return buildMarketingMetadata({
    title: copy.title,
    description: copy.description,
    path: "/contact",
    locale,
    includeLanguageAlternates: true,
    keywords: [
      "commercial cleaning CRM demo",
      "janitorial software consultation",
      "AI tools for cleaning companies",
    ],
  });
}

export default function ContactPage() {
  return (
    <>
      <SeoJsonLd
        payload={getBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
      <ContactPageContent />
    </>
  );
}
