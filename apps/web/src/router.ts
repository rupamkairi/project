import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as indexRoute } from "./routes/index";
import { Route as dashboardRoute } from "./routes/dashboard";
import { platformRoutes, platformRootRoute } from "@projectx/platform-web";

// Create the route tree
// Add platform root with its children to avoid duplicate __root__ IDs
const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  // Add platform root with its children - this replaces the parent
  platformRootRoute.addChildren(platformRoutes),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
