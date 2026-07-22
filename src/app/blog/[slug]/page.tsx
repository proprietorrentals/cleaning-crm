import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { PublicSiteNav } from "@/components/public-site-nav";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { getAllBlogArticles, getBlogArticleBySlug } from "@/lib/blog/articles";
import { buildMarketingMetadata, canonicalUrl } from "@/lib/seo/metadata";
import { getBreadcrumbJsonLd } from "@/lib/seo/structured-data";

type BlogArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatPublishedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export async function generateStaticParams() {
  return getAllBlogArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article Not Found | ServiceOS Blog",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const path = `/blog/${article.slug}`;
  const baseMetadata = buildMarketingMetadata({
    title: `${article.title} | Service OS Blog`,
    description: article.excerpt,
    path,
    keywords: [
      "cleaning CRM",
      "janitorial management software",
      "commercial cleaning operations",
    ],
  });

  return {
    ...baseMetadata,
    openGraph: {
      ...baseMetadata.openGraph,
      type: "article",
      publishedTime: new Date(article.publishedOn).toISOString(),
      url: canonicalUrl(path),
    },
  };
}

export default async function BlogArticlePage({
  params,
}: BlogArticlePageProps) {
  const { slug } = await params;
  const article = getBlogArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e5f0ff_0%,#f8fbff_38%,#f5f8fc_100%)] text-slate-900">
      <PublicSiteNav active="blog" />

      <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <div className="mb-6">
          <Link
            href="/blog"
            className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            ← Back to Blog
          </Link>
        </div>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <SeoJsonLd
            payload={getBreadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: article.title, path: `/blog/${article.slug}` },
            ])}
          />
          <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            {article.category}
          </p>

          <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
            {article.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>{article.author}</span>
            <span>{formatPublishedDate(article.publishedOn)}</span>
            <span>{article.readTimeMinutes} min read</span>
          </div>

          <p className="mt-8 text-lg leading-8 text-slate-700">
            {article.excerpt}
          </p>

          <div className="mt-8 space-y-5 text-base leading-8 text-slate-700">
            <p>
              Service businesses grow when handoffs are clear and measurable.
              This article is a placeholder designed for the first public blog
              release, and it demonstrates the final route shape for future
              Supabase-backed content.
            </p>
            <p>
              In production, this route will fetch rich article content, author
              profiles, and related resources while preserving the same URL
              scheme, metadata contract, and public accessibility rules.
            </p>
            <p>
              For now, each post provides a concise summary of the topic area
              and a stable slug that can be referenced by internal linking,
              campaigns, and future AI-assisted editorial workflows.
            </p>
          </div>
        </article>

        <section className="mt-10 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-10 text-white sm:px-8">
          <h2 className="text-2xl font-semibold">
            Want this playbook implemented in your operation?
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
            Book a live walkthrough and map these workflow improvements directly
            to your cleaning team.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Book a Demo
          </Link>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
