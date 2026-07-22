import Link from "next/link";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicSiteNav } from "@/components/public-site-nav";
import { SeoJsonLd } from "@/components/seo-json-ld";
import type { LandingPageConfig } from "@/lib/seo/landing-pages";
import {
  getBreadcrumbJsonLd,
  getFaqPageJsonLd,
  getOrganizationJsonLd,
  getSoftwareApplicationJsonLd,
} from "@/lib/seo/structured-data";

type SeoLandingPageProps = {
  config: LandingPageConfig;
};

export function SeoLandingPage({ config }: SeoLandingPageProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e6f2ff_0%,#f7fbff_48%,#f3f7fc_100%)] text-slate-900">
      <SeoJsonLd payload={getOrganizationJsonLd()} />
      <SeoJsonLd payload={getSoftwareApplicationJsonLd()} />
      <SeoJsonLd
        payload={getBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: config.heroTitle, path: config.path },
        ])}
      />
      <SeoJsonLd payload={getFaqPageJsonLd(config.faqs)} />

      <PublicSiteNav active="home" />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-sm sm:p-10">
          <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            {config.eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            {config.heroTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            {config.heroDescription}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              View Pricing
            </Link>
            <Link
              href="/demo"
              className="inline-flex rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Explore Demo
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
          <h2 className="text-2xl font-semibold text-slate-950">Benefits</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {config.benefits.map((benefit) => (
              <li
                key={benefit}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
              >
                {benefit}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-950">
            Feature grid
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {config.features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-950">
            How it works
          </h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {config.howItWorks.map((step, index) => (
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
          <h2 className="text-2xl font-semibold text-slate-950">FAQ</h2>
          <div className="mt-5 space-y-3">
            {config.faqs.map((faq) => (
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
            {config.ctaTitle}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700 sm:text-base">
            {config.ctaDescription}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              Book a Demo
            </Link>
            <Link
              href="/pricing"
              className="inline-flex rounded-xl border border-cyan-200 bg-white px-5 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
            >
              Compare Plans
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-950">
            Related pages
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {config.relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/demo"
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Demo
            </Link>
            <Link
              href="/contact"
              className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Contact
            </Link>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
