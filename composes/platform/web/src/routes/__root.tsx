// Platform Compose - Root Route
// This is a minimal root route that acts as a passthrough
// It will be replaced when added to the host app's route tree

import { createRootRoute, Outlet } from "@tanstack/react-router";

const PlatformRootComponent = () => <Outlet />;

export const Route = createRootRoute({
  component: PlatformRootComponent,
});

// Export ID to help with route resolution
export const routeID = "__platform_root__";
