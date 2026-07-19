import { SuperAdminLeadMarketplace } from "@/components/super-admin-lead-marketplace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SuperAdminLeadMarketplacePage() {
  return <SuperAdminLeadMarketplace />;
}
