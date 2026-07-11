import type { Metadata } from "next";
import { WebsiteBuilderShell } from "@/components/website-builder-shell";

export const metadata: Metadata = {
  title: "ServiceOS Website Builder",
  description:
    "Build and manage your ServiceOS website with templates, page structure, customization controls, and quote-request CRM lead capture.",
  openGraph: {
    title: "ServiceOS Website Builder",
    description:
      "Create public website pages for ServiceOS and capture quote requests as CRM leads.",
    images: [{ url: "/serviceos-mark.svg", type: "image/svg+xml" }],
  },
};

export default function WebsiteBuilderPage() {
  return <WebsiteBuilderShell />;
}
