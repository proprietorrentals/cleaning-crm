import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DemoEmployeePage } from "@/components/demo/demo-employee-page";
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
    title: copy.employeeTitle,
    description: copy.employeeDescription,
  };
}

export default function DemoEmployeeRoute() {
  return <DemoEmployeePage />;
}
