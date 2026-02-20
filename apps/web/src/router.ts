import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as indexRoute } from "./routes/index";
import { Route as aboutRoute } from "./routes/about";
import { Route as contactRoute } from "./routes/contact";

// Build the route tree
const routeTree = rootRoute.addChildren([indexRoute, aboutRoute, contactRoute]);

// Create the router
export const router = createRouter({ routeTree });

// Type declaration for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
