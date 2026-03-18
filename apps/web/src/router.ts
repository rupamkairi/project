import { createRouter } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";
import { Route as indexRoute } from "./routes/index";
import { Route as dashboardRoute } from "./routes/dashboard";
import { platformRoutes } from "@projectx/platform-web";

// Create the route tree
// Add platform root with its children to avoid duplicate __root__ IDs
const routeTree = sharedRootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  // Add platform root with its children - this replaces the parent
  ...platformRoutes,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
