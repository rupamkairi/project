import { createRoute } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";

export const ecommerceStorefrontLayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/store",
  component: () => null,
});
