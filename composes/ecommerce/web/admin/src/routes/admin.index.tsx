import { createRoute } from "@tanstack/react-router";
import { ecommerceAdminLayoutRoute } from "./admin.layout";

export const ecommerceAdminIndexRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/",
  component: () => {
    return (
      <div>
        <h1>Ecommerce Admin Dashboard</h1>
      </div>
    );
  },
});
