import { createRoute } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";

export const ecommerceAdminLayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/admin/ecommerce",
  component: () => null,
});
