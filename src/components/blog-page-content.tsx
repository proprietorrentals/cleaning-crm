"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicSiteNav } from "@/components/public-site-nav";
import { getBlogLandingData } from "@/lib/blog/articles";
import type { BlogCategory } from "@/lib/blog/types";

function formatPublishedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function BlogPageContent() {
  const [activeCategory, setActiveCategory] = useState<BlogCategory>("All");
  const { categories, featured, articles } = getBlogLandingData();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e5f0ff_0%,#f8fbff_38%,#f5f8fc_100%)] text-slate-900">
      <PublicSiteNav active="blog" />

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8 lg:p-10">
          <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            ServiceOS Blog
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            Field-tested growth and operations playbooks for commercial cleaning
            teams
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Practical insights on dispatch, quoting, workforce execution, and
            AI-assisted workflows.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {categories.map((category) => {
              const selected = category === activeCategory;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Filter UI is ready. Dynamic category querying will be connected to
            Supabase in a future release.
          </p>
        </section>

        {featured ? (
          <section className="mt-10 grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Featured Article
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950">
                {featured.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                {featured.excerpt}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                  {featured.category}
                </span>
                <span>{featured.author}</span>
                <span>{formatPublishedDate(featured.publishedOn)}</span>
                <span>{featured.readTimeMinutes} min read</span>
              </div>
              <Link
                href="#"
                className="mt-6 inline-flex items-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Read featured article
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 p-6 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-blue-200">
                Coverage
              </p>
              <p className="mt-3 text-2xl font-semibold">
                Operations + AI Workflow
              </p>
              <p className="mt-3 text-sm text-blue-100">{featured.imageHint}</p>
              <div className="mt-8 space-y-2 text-sm text-blue-100">
                <p>Dispatch systems</p>
                <p>Quote-to-cash process</p>
                <p>Manager operating cadence</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-950">
              Latest Articles
            </h2>
            <p className="text-sm text-slate-500">6 articles</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => (
              <article
                key={article.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                  {article.category}
                </p>
                <h3 className="mt-3 text-xl font-semibold leading-tight text-slate-950">
                  {article.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {article.excerpt}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{article.author}</span>
                  <span>{formatPublishedDate(article.publishedOn)}</span>
                  <span>{article.readTimeMinutes} min read</span>
                </div>
                <Link
                  href="#"
                  className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Read article
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Newsletter
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                Get one practical operations brief each week
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Product updates, AI workflow templates, and lessons from
                commercial cleaning teams scaling with ServiceOS.
              </p>
            </div>

            <form className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <label htmlFor="blog-newsletter-email" className="sr-only">
                Work email
              </label>
              <input
                id="blog-newsletter-email"
                type="email"
                placeholder="Work email"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 sm:min-w-[280px]"
              />
              <button
                type="button"
                className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Subscribe
              </button>
            </form>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Signup UI only. Backend email capture can be connected later without
            changing this layout.
          </p>
        </section>

        <section className="mt-14 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-10 text-white sm:px-8">
          <p className="text-xs uppercase tracking-[0.18em] text-blue-200">
            Ready to operationalize this?
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
            See how ServiceOS runs your quote-to-cash workflow in one platform.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
            Book a guided demo and map your team’s real process in less than 30
            minutes.
          </p>
          <Link
            href="/contact"
            className="mt-7 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Book a Demo
          </Link>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
