import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ExploreDemoShell } from "@/components/explore-demo-shell";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { exploreDemoData } from "@/lib/explore-demo-data";
import { buildMarketingMetadata, resolveSeoLocale } from "@/lib/seo/metadata";
import { getBreadcrumbJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveSeoLocale(cookieStore.get("serviceos_lang")?.value);

  const copy =
    locale === "es"
      ? {
          title:
            "Explorar Service OS | Demo de software para limpieza comercial",
          description:
            "Explora una vista publica de Service OS para entender el CRM de limpieza, flujos operativos y gestion con IA.",
        }
      : {
          title: "Explore Service OS | Commercial Cleaning Software Demo",
          description:
            "Preview Service OS with a public walkthrough of cleaning CRM tools, janitorial workflows, and AI-assisted operational controls.",
        };

  return buildMarketingMetadata({
    title: copy.title,
    description: copy.description,
    path: "/explore",
    locale,
    includeLanguageAlternates: true,
    keywords: [
      "commercial cleaning software demo",
      "cleaning CRM",
      "janitorial management software",
    ],
  });
}

export default function ExplorePage() {
  return (
    <>
      <SeoJsonLd
        payload={getBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Explore", path: "/explore" },
        ])}
      />
      <ExploreDemoShell data={exploreDemoData} />
    </>
  );
}
