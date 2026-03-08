import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as indexRoute } from "./routes/index";
import { Route as aboutRoute } from "./routes/about";
import { Route as contactRoute } from "./routes/contact";

const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  contactRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
