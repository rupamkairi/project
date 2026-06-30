import { createRoute } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";
import { AdminDashboardPage } from "./pages/dashboard";
import { AdminMenuPage } from "./pages/menu";
import { AdminInventoryPage } from "./pages/inventory";
import { AdminAggregatorsPage } from "./pages/aggregators";
import { AdminAnalyticsPage } from "./pages/analytics";

const adminDashboardRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/admin/dashboard",
  component: AdminDashboardPage,
});

const adminMenuRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/admin/menu",
  component: AdminMenuPage,
});

const adminInventoryRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/admin/inventory",
  component: AdminInventoryPage,
});

const adminAggregatorsRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/admin/aggregators",
  component: AdminAggregatorsPage,
});

const adminAnalyticsRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/restaurants/admin/analytics",
  component: AdminAnalyticsPage,
});

export const adminRoutes = [
  adminDashboardRoute,
  adminMenuRoute,
  adminInventoryRoute,
  adminAggregatorsRoute,
  adminAnalyticsRoute,
];
