// Ecommerce Module

import type { AppModule, BootRegistry } from "../../core/module";
import * as commands from "./commands";
import * as queries from "./queries";
import * as events from "./events";
import * as fsm from "./fsm";
import * as entities from "./entities";
import * as workflows from "./workflows";

// Compose imports
import {
  EcommerceCompose,
  getEcommerceCompose,
  getModuleConfig,
} from "./compose";
import * as composeHooks from "./compose/hooks";
import * as composeRules from "./compose/rules";

// Schema types for the manifest
const schemaEntities = [
  "ecomAddresses",
  "ecomOrders",
  "ecomOrderItems",
  "ecomOrderHistory",
  "ecomCarts",
  "ecomCartItems",
  "ecomCoupons",
  "ecomCouponUsage",
];

// Get event names from the events module
const eventNames = [
  "order.placed",
  "order.confirmed",
  "order.processing",
  "order.shipped",
  "order.delivered",
  "order.cancelled",
  "order.refunded",
  "payment.received",
  "payment.failed",
  "cart.created",
  "cart.updated",
  "cart.converted",
];

// Get command names from the commands module
const commandNames = [
  "createOrder",
  "updateOrder",
  "cancelOrder",
  "placeOrder",
  "confirmPayment",
  "failPayment",
  "updateOrderStatus",
  "requestRefund",
  "processRefund",
  "createCart",
  "addToCart",
  "updateCartItem",
  "removeFromCart",
  "applyCoupon",
  "removeCoupon",
  "convertCart",
  "createCoupon",
  "updateCoupon",
  "deleteCoupon",
  "createAddress",
  "updateAddress",
  "deleteAddress",
  "setDefaultAddress",
];

// Get query names from the queries module
const queryNames = [
  "getOrder",
  "listOrders",
  "getOrderByCustomer",
  "getCart",
  "getActiveCart",
  "validateCoupon",
  "getAddresses",
];

export const EcommerceModule: AppModule = {
  manifest: {
    id: "ecommerce",
    version: "0.1.0",
    dependsOn: [
      "identity",
      "catalog",
      "inventory",
      "ledger",
      "workflow",
      "geo",
      "notification",
      "analytics",
    ],
    entities: schemaEntities,
    events: eventNames,
    commands: commandNames,
    queries: queryNames,
    fsms: ["order"],
    migrations: [],
  },

  async boot(registry: BootRegistry): Promise<void> {
    // Register command handlers
    for (const name of commandNames) {
      const commandName = `ecom.${name}`;
      const handler = (commands as Record<string, unknown>)[name];
      if (typeof handler === "function") {
        registry.registerCommand(commandName, handler as never);
      }
    }

    // Register query handlers
    for (const name of queryNames) {
      const queryName = `ecom.${name}`;
      const handler = (queries as Record<string, unknown>)[name];
      if (typeof handler === "function") {
        registry.registerQuery(queryName, handler as never);
      }
    }

    // Register event listeners (handlers would be registered for domain event processing)

    // Register FSMs
    registry.registerFSM(fsm.orderFSM);
  },

  async shutdown(): Promise<void> {
    // Cleanup
  },
};

// Export all module components
export { commands, queries, events, fsm, entities, workflows };
export { EcommerceCompose, getEcommerceCompose, getModuleConfig };
export { composeHooks, composeRules };

// Re-export specific types and functions for convenience
export type { OrderStatus, OrderEvent } from "./fsm";
export { orderFSM } from "./fsm";
export type { OrderFulfillmentTemplate } from "./workflows";
export {
  ORDER_FULFILLMENT_TEMPLATE,
  ECOMMERCE_WORKFLOW_TEMPLATES,
} from "./workflows";

// Default export for convenience
export default EcommerceModule;
