import type { Metadata } from "next";
import { PricingPageContent } from "@/components/pricing-page-content";

export const metadata: Metadata = {
  title: "ServiceOS Pricing | AI Operating System for Service Businesses",
  description:
    "Compare ServiceOS pricing plans for an AI-powered operating system for service businesses.",
  openGraph: {
    title: "ServiceOS Pricing | AI Operating System for Service Businesses",
    description:
      "Compare ServiceOS pricing plans, feature differences, FAQs, and calls to action for service teams.",
    images: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function PricingPage() {
  return <PricingPageContent />;
}
