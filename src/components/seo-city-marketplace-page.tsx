import Link from "next/link";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicSiteNav } from "@/components/public-site-nav";
import { SeoJsonLd } from "@/components/seo-json-ld";
import {
  buildMarketplaceCityPath,
  type MarketplaceCityPage,
} from "@/lib/seo/marketplace-city-pages";
import {
  getBreadcrumbJsonLd,
  getFaqPageJsonLd,
} from "@/lib/seo/structured-data";

type SeoCityMarketplacePageProps = {
  cityPage: MarketplaceCityPage;
};

export function SeoCityMarketplacePage({
  cityPage,
}: SeoCityMarketplacePageProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e7f1ff_0%,#f8fbff_45%,#f2f8fd_100%)] text-slate-900">
      <SeoJsonLd
        payload={getBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          {
            name: "Commercial Cleaning Leads",
            path: "/commercial-cleaning-leads",
          },
          {
            name: `${cityPage.cityName}, ${cityPage.stateCode}`,
            path: buildMarketplaceCityPath(
              cityPage.stateSlug,
              cityPage.citySlug,
            ),
          },
        ])}
      />
      <SeoJsonLd payload={getFaqPageJsonLd(cityPage.faqs)} />

      <PublicSiteNav active="home" />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-sm sm:p-10">
          <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            {cityPage.cityName}, {cityPage.stateCode} Marketplace Focus
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            {cityPage.heroTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            {cityPage.heroDescription}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Explore Demo
            </Link>
            <Link
              href="/pricing"
              className="inline-flex rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View Pricing
            </Link>
            <Link
              href="/contact"
              className="inline-flex rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Talk to Sales
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-950">
            Market overview
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700 sm:text-base">
            {cityPage.marketOverview}
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {cityPage.marketSignals.map((signal) => (
              <li
                key={signal}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
              >
                {signal}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-950">
            Why Service OS
          </h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {cityPage.whyServiceOs.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-950">
            How it works
          </h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {cityPage.howItWorks.map((step, index) => (
              <li
                key={step}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-950">Local FAQ</h2>
          <div className="mt-5 space-y-3">
            {cityPage.faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <h3 className="text-base font-semibold text-slate-900">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-blue-50 to-sky-50 p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-950">
            {cityPage.ctaTitle}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
            {cityPage.ctaDescription}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              Book a Demo
            </Link>
            <Link
              href="/commercial-cleaning-leads"
              className="inline-flex rounded-xl border border-cyan-200 bg-white px-5 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
            >
              Marketplace Overview
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-slate-950">
              Related SaaS pages
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {cityPage.relatedSaasLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-slate-950">
              Nearby city pages
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {cityPage.nearbyCities.map((city) => (
                <Link
                  key={`${city.stateSlug}-${city.citySlug}`}
                  href={buildMarketplaceCityPath(city.stateSlug, city.citySlug)}
                  className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {city.label}
                </Link>
              ))}
            </div>
          </article>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
