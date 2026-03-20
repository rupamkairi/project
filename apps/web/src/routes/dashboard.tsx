import { sharedRootRoute } from "@projectx/shared-router";
import { Button } from "@projectx/ui";
import { createRoute } from "@tanstack/react-router";

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/_dashboard",
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div>
      <p>_dashboard Button From UI Package</p>
      <Button variant={"ghost"}>_dashboard Button From UI Package</Button>
    </div>
  );
}
