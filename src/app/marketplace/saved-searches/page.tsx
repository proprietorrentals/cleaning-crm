import { AdminGuard } from "@/components/admin-guard";
import { MarketplacePageShell } from "@/components/marketplace-page-shell";
import { MarketplaceSavedSearchesPanel } from "@/components/marketplace-saved-searches-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MarketplaceSavedSearchesPage() {
  return (
    <AdminGuard>
      <MarketplacePageShell
        title="Saved Searches"
        subtitle="Save recurring lead criteria and receive smart alerts when verified marketplace leads match."
        activeTab="saved-searches"
      >
        <MarketplaceSavedSearchesPanel />
      </MarketplacePageShell>
    </AdminGuard>
  );
}
