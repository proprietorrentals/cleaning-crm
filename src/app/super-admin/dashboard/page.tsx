import { redirect } from "next/navigation";

export default function LegacySuperAdminDashboardRedirect() {
  console.info("super-admin dashboard redirect", {
    currentPath: "/super-admin/dashboard",
    redirectDestination: "/super-admin",
    reason: "legacy-dashboard-route",
  });
  redirect("/super-admin");
}
