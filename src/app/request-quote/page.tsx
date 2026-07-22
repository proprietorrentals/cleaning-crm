import type { Metadata } from "next";
import { cookies } from "next/headers";
import { RequestQuoteForm } from "@/app/request-quote/request-quote-form";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { buildMarketingMetadata, resolveSeoLocale } from "@/lib/seo/metadata";
import { getBreadcrumbJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveSeoLocale(cookieStore.get("serviceos_lang")?.value);

  const copy =
    locale === "es"
      ? {
          title: "Solicita una cotizacion de limpieza comercial | Service OS",
          description:
            "Comparte los detalles de tu instalacion para recibir propuestas de equipos de limpieza comercial a traves de Service OS.",
        }
      : {
          title:
            "Request a Commercial Cleaning Quote | Service OS Lead Marketplace",
          description:
            "Submit facility requirements and get matched with commercial cleaning providers using Service OS lead and workflow technology.",
        };

  return buildMarketingMetadata({
    title: copy.title,
    description: copy.description,
    path: "/request-quote",
    locale,
    includeLanguageAlternates: true,
    keywords: [
      "commercial cleaning leads",
      "request cleaning quote",
      "janitorial management software",
    ],
  });
}

export default function RequestQuotePage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <SeoJsonLd
        payload={getBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Request Quote", path: "/request-quote" },
        ])}
      />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-8 max-w-3xl">
          <p className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-800">
            Lead Marketplace
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Request a commercial cleaning quote
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Tell us about your property, scope, and timeline. We will match your
            request with the right commercial cleaning team.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <RequestQuoteForm />
        </div>
      </div>
    </main>
  );
}
