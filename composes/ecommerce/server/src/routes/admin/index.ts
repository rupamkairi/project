import type { Mediator, AdapterRegistry } from "@core";
import { createProductsRoutes } from "./products";
import { createOrdersRoutes } from "./orders";
import { createCustomersRoutes } from "./customers";
import { createCategoriesRoutes } from "./categories";
import { createFulfillmentsRoutes } from "./fulfillments";
import { createReturnsRoutes } from "./returns";
import { createRegionsRoutes } from "./regions";
import { createShippingRoutes } from "./shipping";
import { createTaxRoutes } from "./tax";
import { createAnalyticsRoutes } from "./analytics";

export function createAdminRoutes(mediator: Mediator, adapters: AdapterRegistry) {
  return [
    createProductsRoutes(mediator),
    createOrdersRoutes(mediator),
    createCustomersRoutes(mediator),
    createCategoriesRoutes(mediator),
    createFulfillmentsRoutes(mediator),
    createReturnsRoutes(mediator, adapters),
    createRegionsRoutes(mediator),
    createShippingRoutes(mediator),
    createTaxRoutes(mediator),
    createAnalyticsRoutes(mediator),
  ];
}
