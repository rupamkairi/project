import { createRoute } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";
import { PosOrdersPage } from "./pages/orders";
import { NewOrderPage } from "./pages/new-order";
import { OrderDetailPage } from "./pages/order-detail";
import { PosTablesPage } from "./pages/tables";

const posOrdersRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/pos/orders",
  component: PosOrdersPage,
});

const posNewOrderRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/pos/orders/new",
  component: NewOrderPage,
});

const posOrderDetailRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/pos/orders/$id",
  component: OrderDetailPage,
});

const posTablesRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/pos/tables",
  component: PosTablesPage,
});

export const posRoutes = [
  posOrdersRoute,
  posNewOrderRoute,
  posOrderDetailRoute,
  posTablesRoute,
];
