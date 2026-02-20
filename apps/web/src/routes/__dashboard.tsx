import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { DashboardLayout } from "@/components/dashboard-layout";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardLayout,
});
