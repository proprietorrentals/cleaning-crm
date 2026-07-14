import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DemoCustomerPage } from "@/components/demo/demo-customer-page";
import {
  type DemoMetadataLanguage,
  demoMetadataByLanguage,
} from "@/lib/demo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lang = (
    cookieStore.get("serviceos_lang")?.value === "es" ? "es" : "en"
  ) as DemoMetadataLanguage;
  const copy = demoMetadataByLanguage[lang];

  return {
    title: copy.customerTitle,
    description: copy.customerDescription,
  };
}

export default function DemoCustomerRoute() {
  return <DemoCustomerPage />;
}
