import { SuperAdminPotentialLeadsWorkspace } from "@/components/super-admin-potential-leads-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SuperAdminVerifiedPotentialLeadsPage() {
  return (
    <SuperAdminPotentialLeadsWorkspace
      scope="verified"
      title="Verified Leads"
      description="Potential leads that were verified and promoted into the marketplace lead workflow."
    />
  );
}
