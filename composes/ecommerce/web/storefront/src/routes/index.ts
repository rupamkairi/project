import { ecommerceStorefrontLayoutRoute } from "./store.layout";
import { ecommerceStorefrontIndexRoute } from "./store.index";

export const ecommerceStorefrontRoutes = [
  ecommerceStorefrontLayoutRoute.addChildren([
    ecommerceStorefrontIndexRoute,
  ]),
];
