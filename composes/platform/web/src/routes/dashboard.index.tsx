import { createRoute } from "@tanstack/react-router";
import { ComposeDashboard } from "@projectx/ui";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";
import { dashboardSections } from "@projectx/shared-router";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/",
  component: DashboardIndex,
});

function DashboardIndex() {
  return (
    <ComposeDashboard
      eyebrow="ProjectX"
      title="Dashboard"
      description="Manage platform settings and access from one grouped view."
      sections={dashboardSections}
    />
  );
}
