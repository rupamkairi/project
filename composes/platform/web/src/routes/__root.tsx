// Platform Compose - Root Route
// This provides a root route for the platform compose routes
// The host app should use this as the base or integrate with its own root route

import { createRootRoute, Outlet } from "@tanstack/react-router";

// Export a root route that can be used as parent for platform routes
// In production, the host app would typically provide its own root route
export const Route = createRootRoute({
  component: () => (
    <div className="platform-compose-root">
      <Outlet />
    </div>
  ),
});
