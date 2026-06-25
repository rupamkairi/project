import { posRoutes } from "../apps/pos/routes";
import { kdsRoutes } from "../apps/kds/routes";
import { deliveryRoutes } from "../apps/delivery/routes";
import { adminRoutes } from "../apps/admin/routes";
import { customerRoutes } from "../apps/customer/routes";

export const restaurantRoutes = [
  ...posRoutes,
  ...kdsRoutes,
  ...deliveryRoutes,
  ...adminRoutes,
  ...customerRoutes,
];
