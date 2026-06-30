import { createRoute } from "@tanstack/react-router";
import { ComposeDashboard } from "@projectx/ui";
import { dashboardSections, sharedRootRoute } from "@projectx/shared-router";

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/",
  component: HomePage,
});

function HomePage() {
  return (
    <ComposeDashboard
      title="Compose entry points"
      description="Pick a compose. Cards are grouped by family so the shell stays uniform across routes."
      sections={dashboardSections}
    />
  );
}
