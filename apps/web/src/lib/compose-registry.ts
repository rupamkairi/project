import { crmManifest } from "@projectx/crm-web";
import { ecommerceAdminManifest } from "@projectx/ecommerce-admin";
import { ecommerceStorefrontManifest } from "@projectx/ecommerce-storefront";
import { erpManifest } from "@projectx/erp-web";
import { lmsManifest } from "@projectx/lms-web";
import { platformManifest } from "@projectx/platform-web";
import { restaurantManifest } from "@projectx/restaurant-web";

export const composeRegistry = [
  platformManifest,
  crmManifest,
  ecommerceAdminManifest,
  ecommerceStorefrontManifest,
  erpManifest,
  lmsManifest,
  restaurantManifest,
];
