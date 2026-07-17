import type { Metadata } from "next";
import { BlogPageContent } from "@/components/blog-page-content";

export const metadata: Metadata = {
  title: "ServiceOS Blog | Growth and Operations for Commercial Cleaning Teams",
  description:
    "Read practical playbooks for commercial cleaning operations, AI-assisted workflows, and scalable service growth.",
  openGraph: {
    title:
      "ServiceOS Blog | Growth and Operations for Commercial Cleaning Teams",
    description:
      "Featured insights on dispatch, quoting, field execution, and AI workflow standards.",
    images: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function BlogPage() {
  return <BlogPageContent />;
}
