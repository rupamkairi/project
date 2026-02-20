import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as indexRoute } from "./routes/index";
import { Route as aboutRoute } from "./routes/about";
import { Route as contactRoute } from "./routes/contact";
import { Route as dashboardLayoutRoute } from "./routes/__dashboard";
import { Route as dashboardIndexRoute } from "./routes/dashboard/index";

import { Route as ordersRoute } from "./routes/dashboard/orders/index";
import { Route as orderDetailRoute } from "./routes/dashboard/orders/$orderId";

import { Route as productsRoute } from "./routes/dashboard/products/index";
import { Route as newProductRoute } from "./routes/dashboard/products/new";
import { Route as editProductRoute } from "./routes/dashboard/products/$productId";

import { Route as categoriesRoute } from "./routes/dashboard/categories/index";

import { Route as priceListsRoute } from "./routes/dashboard/price-lists/index";
import { Route as priceListDetailRoute } from "./routes/dashboard/price-lists/$priceListId";

import { Route as inventoryRoute } from "./routes/dashboard/inventory/index";
import { Route as inventoryAdjustRoute } from "./routes/dashboard/inventory/adjust";
import { Route as inventoryTransferRoute } from "./routes/dashboard/inventory/transfer";
import { Route as lowStockRoute } from "./routes/dashboard/inventory/low-stock";

import { Route as customersRoute } from "./routes/dashboard/customers/index";
import { Route as customerDetailRoute } from "./routes/dashboard/customers/$customerId";

import { Route as couponsRoute } from "./routes/dashboard/coupons/index";
import { Route as newCouponRoute } from "./routes/dashboard/coupons/new";
import { Route as editCouponRoute } from "./routes/dashboard/coupons/$couponId";

import { Route as deliveryZonesRoute } from "./routes/dashboard/delivery-zones/index";
import { Route as newDeliveryZoneRoute } from "./routes/dashboard/delivery-zones/new";
import { Route as editDeliveryZoneRoute } from "./routes/dashboard/delivery-zones/$zoneId";

import { Route as workflowRoute } from "./routes/dashboard/workflow/index";
import { Route as workflowInstanceRoute } from "./routes/dashboard/workflow/$instanceId";

import { Route as notificationsRoute } from "./routes/dashboard/notifications/index";
import { Route as templateEditorRoute } from "./routes/dashboard/notifications/$templateKey";

import { Route as settingsRoute } from "./routes/dashboard/settings/index";
import { Route as paymentSettingsRoute } from "./routes/dashboard/settings/payments";
import { Route as teamSettingsRoute } from "./routes/dashboard/settings/team";

const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  contactRoute,
  dashboardLayoutRoute.addChildren([
    dashboardIndexRoute,
    ordersRoute.addChildren([orderDetailRoute]),
    productsRoute.addChildren([newProductRoute, editProductRoute]),
    categoriesRoute,
    priceListsRoute.addChildren([priceListDetailRoute]),
    inventoryRoute.addChildren([
      inventoryAdjustRoute,
      inventoryTransferRoute,
      lowStockRoute,
    ]),
    customersRoute.addChildren([customerDetailRoute]),
    couponsRoute.addChildren([newCouponRoute, editCouponRoute]),
    deliveryZonesRoute.addChildren([
      newDeliveryZoneRoute,
      editDeliveryZoneRoute,
    ]),
    workflowRoute.addChildren([workflowInstanceRoute]),
    notificationsRoute.addChildren([templateEditorRoute]),
    settingsRoute.addChildren([paymentSettingsRoute, teamSettingsRoute]),
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
