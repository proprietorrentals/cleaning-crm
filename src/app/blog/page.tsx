import type { Metadata } from "next";
import { cookies } from "next/headers";
import { BlogPageContent } from "@/components/blog-page-content";
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
            "Blog de Service OS | Estrategias para empresas de limpieza comercial",
          description:
            "Lee guias sobre CRM de limpieza, gestion operativa, herramientas de IA y crecimiento de contratos comerciales.",
        }
      : {
          title:
            "Service OS Blog | Commercial Cleaning Growth and Operations Playbooks",
          description:
            "Practical guides for cleaning CRM strategy, janitorial operations, AI workflows, and winning more commercial cleaning leads.",
        };

  return buildMarketingMetadata({
    title: copy.title,
    description: copy.description,
    path: "/blog",
    locale,
    includeLanguageAlternates: true,
    keywords: [
      "cleaning CRM blog",
      "janitorial management software tips",
      "AI tools for cleaning companies",
      "commercial cleaning leads",
    ],
  });
}

export default function BlogPage() {
  return (
    <>
      <SeoJsonLd
        payload={getBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      <BlogPageContent />
    </>
  );
}
