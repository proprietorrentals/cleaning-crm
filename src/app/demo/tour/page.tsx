import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DemoTourPage } from "@/components/demo/demo-tour-page";
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
    title: copy.tourTitle,
    description: copy.tourDescription,
  };
}

export default function DemoTourRoute() {
  return <DemoTourPage />;
}
