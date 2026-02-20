import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as indexRoute } from "./routes/index";
import { Route as aboutRoute } from "./routes/about";
import { Route as contactRoute } from "./routes/contact";
import { Route as dashboardLayoutRoute } from "./routes/__dashboard";
import { Route as dashboardIndexRoute } from "./routes/dashboard/index";

const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  contactRoute,
  dashboardLayoutRoute.addChildren([dashboardIndexRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
