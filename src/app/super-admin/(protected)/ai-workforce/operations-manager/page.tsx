import { notFound } from "next/navigation";
import { AiEmployeeWorkspace } from "@/components/ai-employee-workspace";
import { getAiEmployeeBySlug } from "@/lib/ai-workforce/employees";

const OPERATIONS_CONTEXT_FIELDS = [
  {
    key: "business_type",
    label: "Business type",
    placeholder: "Commercial and residential cleaning",
  },
  {
    key: "team_size",
    label: "Team size",
    placeholder: "18 field technicians, 2 dispatch coordinators",
  },
  {
    key: "current_workflow",
    label: "Current workflow",
    placeholder: "Leads -> quotes -> jobs -> invoicing",
  },
  {
    key: "operational_problem",
    label: "Operational problem",
    placeholder: "Frequent handoff gaps between sales and field teams",
  },
  {
    key: "desired_outcome",
    label: "Desired outcome",
    placeholder: "Consistent execution with fewer missed tasks",
  },
  {
    key: "constraints",
    label: "Constraints",
    placeholder: "No additional headcount this quarter",
  },
  {
    key: "notes",
    label: "Notes",
    placeholder: "Known risks, dependencies, and compliance requirements",
  },
];

const OPERATIONS_QUICK_ACTIONS = [
  "Create SOP recommendations",
  "Design step-by-step workflow",
  "Build employee checklist",
  "Draft quality-control procedure",
  "Create onboarding plan",
  "Improve scheduling and handoffs",
  "Analyze bottlenecks and risks",
  "Suggest automation opportunities",
  "Build a 30-day implementation plan",
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function OperationsManagerWorkspacePage() {
  const employee = getAiEmployeeBySlug("operations-manager");

  if (!employee || employee.status !== "active") {
    notFound();
  }

  return (
    <AiEmployeeWorkspace
      employee={employee}
      quickActions={OPERATIONS_QUICK_ACTIONS}
      contextFields={OPERATIONS_CONTEXT_FIELDS}
      taskType="operations_planning"
    />
  );
}
