import type { Metadata } from "next";
import { HomeRouteShell } from "@/components/home-route-shell";

export const metadata: Metadata = {
  title: "ServiceOS | Run Your Service Business Smarter.",
  description:
    "Operate with Confidence. ServiceOS helps service businesses manage leads, quotes, jobs, employees, photos, signatures, mileage, invoices, payments, and AI reports in one platform.",
  openGraph: {
    title: "ServiceOS | Run Your Service Business Smarter.",
    description:
      "From Lead to Payment. One Platform. ServiceOS helps service businesses run operations with confidence.",
    images: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export default function HomePage() {
  return <HomeRouteShell />;
}
