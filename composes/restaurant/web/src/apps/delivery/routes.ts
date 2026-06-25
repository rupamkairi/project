import { createRoute } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";
import { DeliveryDispatcherPage } from "./pages/dispatcher";
import { DeliveryRiderPage } from "./pages/rider";

const deliveryDispatchRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/delivery/dispatch",
  component: DeliveryDispatcherPage,
});

const deliveryRidersRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/delivery/riders",
  component: DeliveryRiderPage,
});

export const deliveryRoutes = [deliveryDispatchRoute, deliveryRidersRoute];
