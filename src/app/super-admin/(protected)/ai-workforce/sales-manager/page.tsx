import { notFound } from "next/navigation";
import { AiEmployeeWorkspace } from "@/components/ai-employee-workspace";
import { getAiEmployeeBySlug } from "@/lib/ai-workforce/employees";

const SALES_CONTEXT_FIELDS = [
  { key: "company_name", label: "Company name", placeholder: "Acme Cleaning" },
  { key: "contact_name", label: "Contact name", placeholder: "Jordan Lee" },
  { key: "website", label: "Website", placeholder: "https://example.com" },
  { key: "location", label: "Location", placeholder: "Dallas, TX" },
  { key: "industry", label: "Industry", placeholder: "Commercial cleaning" },
  { key: "company_size", label: "Company size", placeholder: "25 employees" },
  {
    key: "current_tools",
    label: "Current tools",
    placeholder: "Spreadsheets, QuickBooks",
  },
  {
    key: "pain_points",
    label: "Pain points",
    placeholder: "Missed follow-ups, no dispatch visibility",
  },
  {
    key: "previous_interaction",
    label: "Previous interaction",
    placeholder: "Booked discovery call last quarter",
  },
  {
    key: "notes",
    label: "Notes",
    placeholder: "Any verified facts or constraints",
  },
];

const SALES_QUICK_ACTIONS = [
  "Create cold email",
  "Write follow-up",
  "Generate call script",
  "Handle an objection",
  "Create sales proposal",
  "Score a prospect",
  "Recommend next action",
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SalesManagerWorkspacePage() {
  const employee = getAiEmployeeBySlug("sales-manager");

  if (!employee || employee.status !== "active") {
    notFound();
  }

  return (
    <AiEmployeeWorkspace
      employee={employee}
      quickActions={SALES_QUICK_ACTIONS}
      contextFields={SALES_CONTEXT_FIELDS}
      taskType="sales_outreach"
    />
  );
}
