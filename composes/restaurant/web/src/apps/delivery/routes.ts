import { createRoute } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";
import { DeliveryDispatcherPage } from "./pages/dispatcher";
import { DeliveryRiderPage } from "./pages/rider";

const deliveryDispatchRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/delivery/dispatch",
  component: DeliveryDispatcherPage,
});

const deliveryRidersRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/delivery/riders",
  component: DeliveryRiderPage,
});

export const deliveryRoutes = [deliveryDispatchRoute, deliveryRidersRoute];
