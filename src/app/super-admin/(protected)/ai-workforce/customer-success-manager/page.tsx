import { notFound } from "next/navigation";
import { AiEmployeeWorkspace } from "@/components/ai-employee-workspace";
import { getAiEmployeeBySlug } from "@/lib/ai-workforce/employees";

const CUSTOMER_SUCCESS_CONTEXT_FIELDS = [
  {
    key: "account_name",
    label: "Customer or account name",
    placeholder: "Northstar Facilities",
  },
  {
    key: "service_type",
    label: "Service type",
    placeholder: "Recurring commercial cleaning",
  },
  {
    key: "contract_stage",
    label: "Contract stage",
    placeholder: "Mid-term renewal window",
  },
  {
    key: "health_status",
    label: "Customer health status",
    placeholder: "At risk",
  },
  {
    key: "recent_feedback",
    label: "Recent feedback",
    placeholder: "Requested faster issue response and clearer updates",
  },
  {
    key: "current_issue_or_risk",
    label: "Current issue or risk",
    placeholder: "Service inconsistency at two locations",
  },
  {
    key: "renewal_date",
    label: "Renewal date",
    placeholder: "2026-10-15",
  },
  {
    key: "expansion_opportunity",
    label: "Expansion opportunity",
    placeholder: "Add janitorial supply management at HQ",
  },
  {
    key: "notes",
    label: "Notes",
    placeholder: "Known constraints, commitments, and decision-makers",
  },
];

const CUSTOMER_SUCCESS_QUICK_ACTIONS = [
  "Create customer health assessment",
  "Identify retention risks",
  "Recommend next actions",
  "Draft complaint-resolution plan",
  "Write customer follow-up email",
  "Create check-in call script",
  "Build renewal preparation checklist",
  "Recommend upsell or expansion options",
  "Draft review-request message",
  "Build 30-day customer success plan",
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CustomerSuccessManagerWorkspacePage() {
  const employee = getAiEmployeeBySlug("customer-success-manager");

  if (!employee || employee.status !== "active") {
    notFound();
  }

  return (
    <AiEmployeeWorkspace
      employee={employee}
      quickActions={CUSTOMER_SUCCESS_QUICK_ACTIONS}
      contextFields={CUSTOMER_SUCCESS_CONTEXT_FIELDS}
      taskType="customer_success"
    />
  );
}
