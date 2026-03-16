import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as indexRoute } from "./routes/index";
import { platformRoutes } from "@projectx/platform-web";

// Create the route tree - platform routes will be added as children of root
const routeTree = rootRoute.addChildren([indexRoute, ...platformRoutes]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
