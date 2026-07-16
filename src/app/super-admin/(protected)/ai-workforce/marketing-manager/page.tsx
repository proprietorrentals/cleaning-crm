import { notFound } from "next/navigation";
import { AiEmployeeWorkspace } from "@/components/ai-employee-workspace";
import { getAiEmployeeBySlug } from "@/lib/ai-workforce/employees";

const MARKETING_CONTEXT_FIELDS = [
  {
    key: "target_audience",
    label: "Target audience",
    placeholder: "Owners of 5-50 employee cleaning companies",
  },
  { key: "platform", label: "Platform", placeholder: "LinkedIn" },
  {
    key: "campaign_goal",
    label: "Campaign goal",
    placeholder: "Generate qualified demo requests",
  },
  {
    key: "offer",
    label: "Offer",
    placeholder: "14-day workflow optimization blueprint",
  },
  { key: "tone", label: "Tone", placeholder: "Confident and practical" },
  {
    key: "call_to_action",
    label: "Call to action",
    placeholder: "Book a demo",
  },
  {
    key: "keywords",
    label: "Keywords",
    placeholder: "cleaning CRM, scheduling software",
  },
  { key: "content_length", label: "Content length", placeholder: "150 words" },
  {
    key: "notes",
    label: "Notes",
    placeholder: "Positioning constraints or claims policy",
  },
];

const MARKETING_QUICK_ACTIONS = [
  "Create Facebook post",
  "Create Instagram caption",
  "Create LinkedIn post",
  "Create short-form video script",
  "Create YouTube script",
  "Write blog article",
  "Create email newsletter",
  "Build weekly content calendar",
  "Create ad copy",
  "Generate SEO topic ideas",
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MarketingManagerWorkspacePage() {
  const employee = getAiEmployeeBySlug("marketing-manager");

  if (!employee || employee.status !== "active") {
    notFound();
  }

  return (
    <AiEmployeeWorkspace
      employee={employee}
      quickActions={MARKETING_QUICK_ACTIONS}
      contextFields={MARKETING_CONTEXT_FIELDS}
      taskType="marketing_content"
    />
  );
}
