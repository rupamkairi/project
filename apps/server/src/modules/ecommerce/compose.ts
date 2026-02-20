// Ecommerce Compose Definition
// Main compose configuration for the Ecommerce platform

import type { ComposeDefinition } from "../../core/compose/types";
import {
  createDefaultPermissionMatrix,
  EcommerceEvents,
} from "../../core/compose/types";

/**
 * Ecommerce Compose Definition
 * This defines the composition of modules that make up the Ecommerce platform
 */
export const EcommerceCompose: ComposeDefinition = {
  id: "ecommerce",
  name: "Ecommerce Platform",
  version: "1.0.0",
  description:
    "Full-featured ecommerce platform with orders, payments, inventory, and more",
  modules: [
    "identity",
    "catalog",
    "inventory",
    "ledger",
    "workflow",
    "geo",
    "notification",
    "analytics",
  ],
  moduleConfig: {
    catalog: {
      itemLabel: "Product",
      enableVariants: true,
      enablePriceLists: true,
      enableBundles: true,
      maxItemsPerOrder: 50,
    },
    inventory: {
      trackingMode: "variant",
      allowBackorder: false,
      lowStockThreshold: 10,
      autoReserveStock: true,
    },
    ledger: {
      baseCurrency: "INR",
      supportedCurrencies: ["INR", "USD", "EUR"],
      defaultAccounts: {
        revenue: "revenue",
        tax: "tax_payable",
        refunds: "refunds",
        paymentReceivable: "payment_receivable",
      },
      enableMultiCurrency: true,
      autoReconcile: true,
    },
    geo: {
      enableDeliveryZones: true,
      enablePickupLocations: true,
      defaultCountry: "IN",
      supportedCountries: ["IN", "US", "EU"],
      enableTaxCalculation: true,
    },
    workflow: {
      defaultTimeout: 86400000, // 24 hours
      maxRetries: 3,
      enableManualApproval: true,
    },
    notification: {
      enabledChannels: ["email", "sms", "push"],
      defaultSender: "noreply@store.com",
      retryAttempts: 3,
    },
    identity: {
      requireEmailVerification: false,
      requirePhoneVerification: false,
      allowSocialLogin: true,
      mfaEnabled: false,
      sessionTimeout: 86400,
    },
  },
  permissions: createDefaultPermissionMatrix(),
  hooks: [
    // Order lifecycle hooks will be registered at runtime
    {
      id: "on-order-placed",
      on: EcommerceEvents.ORDER_PLACED,
      handler: "ecommerce.hooks.onOrderPlaced",
    },
    {
      id: "on-payment-received",
      on: EcommerceEvents.PAYMENT_RECEIVED,
      handler: "ecommerce.hooks.onPaymentReceived",
    },
    {
      id: "on-payment-failed",
      on: EcommerceEvents.PAYMENT_FAILED,
      handler: "ecommerce.hooks.onPaymentFailed",
    },
    {
      id: "on-order-shipped",
      on: EcommerceEvents.SHIPMENT_DISPATCHED,
      handler: "ecommerce.hooks.onOrderShipped",
    },
    {
      id: "on-order-delivered",
      on: EcommerceEvents.SHIPMENT_DELIVERED,
      handler: "ecommerce.hooks.onOrderDelivered",
    },
    {
      id: "on-refund-requested",
      on: EcommerceEvents.RETURN_REQUESTED,
      handler: "ecommerce.hooks.onRefundRequested",
    },
  ],
  rules: [
    // Rules will be registered at runtime
  ],
};

/**
 * Get the compose definition
 */
export function getEcommerceCompose(): ComposeDefinition {
  return EcommerceCompose;
}

/**
 * Get module configuration for a specific module
 */
export function getModuleConfig(moduleId: string) {
  return EcommerceCompose.moduleConfig?.[
    moduleId as keyof typeof EcommerceCompose.moduleConfig
  ];
}

export default EcommerceCompose;
