import type { Mediator, AdapterRegistry } from "@core";
import { createCatalogRoutes } from "./catalog";
import { createCartRoutes } from "./cart";
import { createCheckoutRoutes } from "./checkout";
import { createCustomerRoutes } from "./customer";

export function createStoreRoutes(mediator: Mediator, adapters: AdapterRegistry) {
  return [
    createCatalogRoutes(mediator),
    createCartRoutes(mediator),
    createCheckoutRoutes(mediator, adapters),
    createCustomerRoutes(mediator),
  ];
}
