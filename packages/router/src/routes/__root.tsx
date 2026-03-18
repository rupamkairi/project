// Platform Compose - Root Route
// This is a minimal root route that acts as a passthrough
// It will be replaced when added to the host app's route tree

import { createRootRoute, Outlet } from "@tanstack/react-router";
import { rootRouteLayout as SharedRootComponent } from "./root.layout";
// const SharedRootComponent = () => <Outlet />;

export const sharedRootRoute = createRootRoute({
  component: SharedRootComponent,
});

// Export ID to help with route resolution
export const routeID = "__shared_root__";
