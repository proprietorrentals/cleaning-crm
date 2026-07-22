import { SuperAdminPotentialLeadsWorkspace } from "@/components/super-admin-potential-leads-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SuperAdminPotentialLeadsPage() {
  return (
    <SuperAdminPotentialLeadsWorkspace
      scope="potential"
      title="Potential Leads"
      description="AI-assisted lead research workspace for opportunities that are not yet promoted to the verified marketplace feed."
    />
  );
}
