import { createRoute } from "@tanstack/react-router";
import { ecommerceStorefrontLayoutRoute } from "./store.layout";

export const ecommerceStorefrontIndexRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/",
  component: () => {
    return (
      <div>
        <h1>Ecommerce Storefront</h1>
      </div>
    );
  },
});
