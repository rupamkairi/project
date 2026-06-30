import { createRoute } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";
import { CustomerMenuPage } from "./pages/menu";
import { CustomerCartPage } from "./pages/cart";
import { CustomerOrderStatusPage } from "./pages/order-status";

const customerMenuRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/customer/menu",
  component: CustomerMenuPage,
});

const customerCartRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/customer/cart",
  component: CustomerCartPage,
});

const customerOrderStatusRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/customer/order/$id",
  component: CustomerOrderStatusPage,
});

export const customerRoutes = [
  customerMenuRoute,
  customerCartRoute,
  customerOrderStatusRoute,
];
