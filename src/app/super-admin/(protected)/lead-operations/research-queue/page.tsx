import { SuperAdminPotentialLeadsWorkspace } from "@/components/super-admin-potential-leads-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SuperAdminResearchQueuePage() {
  return (
    <SuperAdminPotentialLeadsWorkspace
      scope="research"
      title="Research Queue"
      description="Leads marked as AI Reviewed or Needs Review before verification into marketplace operations."
    />
  );
}
