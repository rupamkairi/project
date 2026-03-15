import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as indexRoute } from "./routes/index";
// import { Route as dashboardRoute } from "./routes/dashboard";

// Platform auth routes
import { Route as loginRoute } from "./routes/platform/auth/login";
import { Route as platformDashboardRoute } from "./routes/platform/dashboard.layout";
import { Route as platformDashboardIndexRoute } from "./routes/platform/dashboard.index";
import { Route as platformUsersRoute } from "./routes/platform/dashboard.users";

// Create the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  // dashboardRoute,
  loginRoute,
  platformDashboardRoute.addChildren([
    platformDashboardIndexRoute,
    platformUsersRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
