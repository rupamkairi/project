import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "@/routes/__root";
import { DashboardLayout } from "../components/layout/dashboard-layout";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lms",
  component: DashboardLayout,
});
