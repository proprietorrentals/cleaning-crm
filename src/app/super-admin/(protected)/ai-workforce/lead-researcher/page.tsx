import { notFound } from "next/navigation";
import { AiEmployeeWorkspace } from "@/components/ai-employee-workspace";
import { getAiEmployeeBySlug } from "@/lib/ai-workforce/employees";

const LEAD_RESEARCH_CONTEXT_FIELDS = [
  {
    key: "company_name",
    label: "Company Name",
    placeholder: "Northstar Facility Services",
  },
  {
    key: "website",
    label: "Website",
    placeholder: "https://example.com",
  },
  {
    key: "city",
    label: "City",
    placeholder: "Phoenix",
  },
  {
    key: "state",
    label: "State",
    placeholder: "AZ",
  },
  {
    key: "industry",
    label: "Industry",
    placeholder: "Commercial Cleaning",
  },
  {
    key: "notes",
    label: "Notes",
    placeholder: "Verified facts and source constraints",
  },
  {
    key: "research_goal",
    label: "Research Goal",
    placeholder: "Assess ICP fit and prep outreach brief",
  },
];

const LEAD_RESEARCH_QUICK_ACTIONS = [
  "Create account research brief",
  "Summarize ICP fit signals",
  "Map likely stakeholder roles",
  "List qualification questions",
  "Draft outbound prep notes",
  "Compile risk and verification gaps",
  "Recommend next research actions",
  "Build prospect dossier outline",
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LeadResearcherWorkspacePage() {
  const employee = getAiEmployeeBySlug("lead-researcher");

  if (!employee || employee.status !== "active") {
    notFound();
  }

  return (
    <AiEmployeeWorkspace
      employee={employee}
      quickActions={LEAD_RESEARCH_QUICK_ACTIONS}
      contextFields={LEAD_RESEARCH_CONTEXT_FIELDS}
      taskType="lead_research"
    />
  );
}
