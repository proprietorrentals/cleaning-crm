import type { Metadata } from "next";
import { DemoPageContent } from "@/components/demo-page-content";

export const metadata: Metadata = {
  title: "ServiceOS Demo | Operate with Confidence.",
  description: "Watch the ServiceOS product walkthrough and explore key workflows before starting your trial.",
};

export default function DemoPage() {
  return <DemoPageContent />;
}
