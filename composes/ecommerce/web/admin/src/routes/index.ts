import { ecommerceAdminLayoutRoute } from "./admin.layout";
import { ecommerceAdminIndexRoute } from "./admin.index";
import { ecoAdminProductsRoute } from "./products/index";
import { ecoAdminProductDetailRoute } from "./products/detail";
import { ecoAdminCategoriesRoute } from "./categories/index";
import { ecoAdminOrdersRoute } from "./orders/index";
import { ecoAdminOrderDetailRoute } from "./orders/detail";
import { ecoAdminFulfillmentRoute } from "./fulfillment/index";
import { ecoAdminReturnsRoute, ecoAdminReturnDetailRoute } from "./returns/index";
import { ecoAdminCustomersRoute, ecoAdminCustomerDetailRoute } from "./customers/index";
import { ecoAdminAnalyticsRoute } from "./analytics/index";
import { ecoAdminSettingsRoute } from "./settings/index";

export const ecommerceAdminRoutes = [
  ecommerceAdminLayoutRoute.addChildren([
    ecommerceAdminIndexRoute,
    ecoAdminProductsRoute,
    ecoAdminProductDetailRoute,
    ecoAdminCategoriesRoute,
    ecoAdminOrdersRoute,
    ecoAdminOrderDetailRoute,
    ecoAdminFulfillmentRoute,
    ecoAdminReturnsRoute,
    ecoAdminReturnDetailRoute,
    ecoAdminCustomersRoute,
    ecoAdminCustomerDetailRoute,
    ecoAdminAnalyticsRoute,
    ecoAdminSettingsRoute,
  ]),
];
