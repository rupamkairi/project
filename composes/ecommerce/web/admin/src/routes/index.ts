import { ecommerceAdminLayoutRoute } from "./admin.layout";
import { ecommerceAdminIndexRoute } from "./admin.index";

export const ecommerceAdminRoutes = [
  ecommerceAdminLayoutRoute.addChildren([
    ecommerceAdminIndexRoute,
  ]),
];
