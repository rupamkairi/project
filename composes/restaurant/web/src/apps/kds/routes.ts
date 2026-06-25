import { createRoute } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";
import { KdsBoardPage } from "./pages/board";

const kdsBoardRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/kds",
  component: KdsBoardPage,
});

export const kdsRoutes = [kdsBoardRoute];
