import type { BlogArticle, BlogCategory } from "@/lib/blog/types";

export const BLOG_CATEGORIES: BlogCategory[] = [
  "All",
  "Operations",
  "AI Workflow",
  "Growth",
  "Leadership",
];

const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: "cleaning-kpi-scorecard",
    slug: "cleaning-kpi-scorecard-that-actually-drives-margin",
    title: "The Cleaning KPI Scorecard That Actually Drives Margin",
    excerpt:
      "A practical breakdown of daily and weekly metrics that help owners catch margin leaks before payroll week.",
    category: "Operations",
    author: "ServiceOS Editorial",
    readTimeMinutes: 7,
    publishedOn: "2026-07-10",
    imageHint: "Operations scorecard dashboard",
    featured: true,
  },
  {
    id: "dispatch-boarding-playbook",
    slug: "dispatch-boarding-playbook-for-fast-growth-cleaning-teams",
    title: "Dispatch Boarding Playbook for Fast-Growth Cleaning Teams",
    excerpt:
      "How to design dispatch rituals that prevent late arrivals, idle drive time, and technician confusion.",
    category: "Operations",
    author: "Alyssa Grant",
    readTimeMinutes: 6,
    publishedOn: "2026-07-08",
    imageHint: "Team dispatch planning board",
  },
  {
    id: "ai-follow-up-system",
    slug: "build-an-ai-follow-up-system-without-losing-brand-voice",
    title: "Build an AI Follow-Up System Without Losing Brand Voice",
    excerpt:
      "Use AI drafting for outreach while keeping human approval controls and message quality standards in place.",
    category: "AI Workflow",
    author: "ServiceOS AI Lab",
    readTimeMinutes: 8,
    publishedOn: "2026-07-05",
    imageHint: "AI generated outreach drafts",
  },
  {
    id: "commercial-bid-win-rate",
    slug: "increase-commercial-bid-win-rate-with-better-site-walk-notes",
    title: "Increase Commercial Bid Win Rate with Better Site-Walk Notes",
    excerpt:
      "Capture the right facts on site-walks so your proposals read specific, credible, and easy to approve.",
    category: "Growth",
    author: "Monica Reyes",
    readTimeMinutes: 5,
    publishedOn: "2026-07-02",
    imageHint: "Commercial facility site walk",
  },
  {
    id: "route-density-playbook",
    slug: "route-density-playbook-for-multi-crew-cleaning-operations",
    title: "Route Density Playbook for Multi-Crew Cleaning Operations",
    excerpt:
      "A step-by-step model for reducing windshield time and keeping your schedule profitable as territory expands.",
    category: "Operations",
    author: "ServiceOS Editorial",
    readTimeMinutes: 9,
    publishedOn: "2026-06-30",
    imageHint: "Map with optimized routes",
  },
  {
    id: "manager-huddles",
    slug: "weekly-manager-huddles-that-prevent-operational-drift",
    title: "Weekly Manager Huddles That Prevent Operational Drift",
    excerpt:
      "Simple meeting structure for cleaning leaders to align sales, dispatch, and field execution each week.",
    category: "Leadership",
    author: "Jordan Hale",
    readTimeMinutes: 4,
    publishedOn: "2026-06-28",
    imageHint: "Leadership team meeting",
  },
  {
    id: "proposal-library",
    slug: "create-a-proposal-library-your-team-will-actually-use",
    title: "Create a Proposal Library Your Team Will Actually Use",
    excerpt:
      "Build reusable proposal blocks for scope, pricing, and compliance language to speed up quote turnaround.",
    category: "Growth",
    author: "ServiceOS Editorial",
    readTimeMinutes: 6,
    publishedOn: "2026-06-24",
    imageHint: "Proposal templates and notes",
  },
];

export function getBlogLandingData() {
  const featured = BLOG_ARTICLES.find((article) => article.featured) ?? null;
  const articles = BLOG_ARTICLES.filter((article) => !article.featured).slice(
    0,
    6,
  );

  return {
    categories: BLOG_CATEGORIES,
    featured,
    articles,
  };
}
