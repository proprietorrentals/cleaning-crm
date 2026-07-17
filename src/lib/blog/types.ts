export type BlogCategory =
  | "All"
  | "Operations"
  | "AI Workflow"
  | "Growth"
  | "Leadership";

export type BlogArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: Exclude<BlogCategory, "All">;
  author: string;
  readTimeMinutes: number;
  publishedOn: string;
  imageHint: string;
  featured?: boolean;
};
