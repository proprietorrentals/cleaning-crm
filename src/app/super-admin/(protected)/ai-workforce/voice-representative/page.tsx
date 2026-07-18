import { notFound } from "next/navigation";
import { AiEmployeeWorkspace } from "@/components/ai-employee-workspace";
import { getAiEmployeeBySlug } from "@/lib/ai-workforce/employees";

const VOICE_CONTEXT_FIELDS = [
  {
    key: "call_type",
    label: "Call type",
    placeholder: "Cold call",
  },
  {
    key: "prospect_or_customer",
    label: "Prospect or customer name",
    placeholder: "Jordan Lee",
  },
  {
    key: "company_name",
    label: "Company name",
    placeholder: "Northstar Facilities",
  },
  {
    key: "industry",
    label: "Industry",
    placeholder: "Commercial cleaning",
  },
  {
    key: "contact_role",
    label: "Contact role",
    placeholder: "Operations Director",
  },
  {
    key: "call_objective",
    label: "Call objective",
    placeholder: "Book a discovery demo",
  },
  {
    key: "offer",
    label: "Offer",
    placeholder: "Workflow optimization review",
  },
  {
    key: "known_pain_points",
    label: "Known pain points",
    placeholder: "Missed follow-ups and no call routing",
  },
  {
    key: "previous_interaction",
    label: "Previous interaction",
    placeholder: "Voicemail left last week",
  },
  {
    key: "desired_tone",
    label: "Desired tone",
    placeholder: "Confident and helpful",
  },
  {
    key: "notes",
    label: "Notes",
    placeholder: "Call prep notes, constraints, and verification reminders",
  },
];

const VOICE_QUICK_ACTIONS = [
  "Cold call",
  "Demo booking",
  "Follow-up call",
  "Appointment confirmation",
  "Missed-call callback",
  "Customer check-in",
  "Renewal call",
  "Upsell call",
  "Voicemail",
  "Objection handling",
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function VoiceRepresentativeWorkspacePage() {
  const employee = getAiEmployeeBySlug("voice-representative");

  if (!employee || employee.status !== "active") {
    notFound();
  }

  return (
    <AiEmployeeWorkspace
      employee={employee}
      quickActions={VOICE_QUICK_ACTIONS}
      contextFields={VOICE_CONTEXT_FIELDS}
      taskType="voice_call_planning"
    />
  );
}
