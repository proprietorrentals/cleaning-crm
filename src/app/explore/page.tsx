import type { Metadata } from "next";
import { ExploreDemoShell } from "@/components/explore-demo-shell";
import { exploreDemoData } from "@/lib/explore-demo-data";

export const metadata: Metadata = {
  title: "ServiceOS Explore Demo",
  description: "Public, read-only demo of the ServiceOS experience with seeded operational data.",
};

export default function ExplorePage() {
  return <ExploreDemoShell data={exploreDemoData} />;
}
