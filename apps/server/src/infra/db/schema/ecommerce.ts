import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { baseColumns, moneyColumns } from "./helpers";

// ============================================
// Enums
// ============================================

// Order Status FSM
export const orderStatusEnum = pgEnum("ecom_order_status", [
  "pending_payment",
  "payment_failed",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

// Payment Status
export const paymentStatusEnum = pgEnum("ecom_payment_status", [
  "pending",
  "authorized",
  "captured",
  "failed",
  "refunded",
  "partially_refunded",
]);

// Fulfillment Status
export const fulfillmentStatusEnum = pgEnum("ecom_fulfillment_status", [
  "not_started",
  "in_progress",
  "shipped",
  "delivered",
  "partially_delivered",
  "returned",
]);

// Coupon Type
export const couponTypeEnum = pgEnum("ecom_coupon_type", [
  "percentage",
  "fixed",
  "shipping",
]);

// Coupon Scope
export const couponScopeEnum = pgEnum("ecom_coupon_scope", [
  "cart",
  "product",
  "category",
  "shipping",
]);

// Cart Status
export const cartStatusEnum = pgEnum("ecom_cart_status", [
  "active",
  "converted",
  "expired",
]);

// ============================================
// Tables
// ============================================

// Addresses (shipping/billing)
export const ecomAddresses = pgTable(
  "ecom_addresses",
  {
    ...baseColumns,
    actorId: text("actor_id").notNull(), // Customer who owns this address
    type: text("type").notNull().default("shipping"), // shipping, billing
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    company: text("company"),
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull().default("IN"),
    phone: text("phone"),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (table) => [
    index("ecom_addresses_org_actor_idx").on(
      table.organizationId,
      table.actorId,
    ),
    index("ecom_addresses_org_default_idx").on(
      table.organizationId,
      table.actorId,
      table.isDefault,
    ),
  ],
);

// Orders
export const ecomOrders = pgTable(
  "ecom_orders",
  {
    ...baseColumns,
    orderNumber: text("order_number").notNull(), // Public-facing order number
    customerId: text("customer_id").notNull(), // FK to actors
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("pending"),
    fulfillmentStatus: fulfillmentStatusEnum("fulfillment_status")
      .notNull()
      .default("not_started"),

    // Addresses
    shippingAddressId: text("shipping_address_id"),
    billingAddressId: text("billing_address_id"),

    // Pricing
    currency: text("currency").notNull().default("INR"),
    ...moneyColumns("subtotal"),
    ...moneyColumns("discount"),
    ...moneyColumns("tax"),
    ...moneyColumns("shippingFee"),
    ...moneyColumns("total"),

    // Coupon
    couponCode: text("coupon_code"),

    // Payment gateway reference
    gatewayRef: text("gateway_ref"), // Payment gateway order/session ID
    paymentUrl: text("payment_url"), // Payment redirect URL
    gateway: text("gateway"), // e.g., stripe, razorpay

    // Ledger & Workflow references
    ledgerTransactionId: text("ledger_transaction_id"),
    workflowInstanceId: text("workflow_instance_id"),

    // Timestamps
    confirmedAt: timestamp("confirmed_at"),
    processingAt: timestamp("processing_at"),
    shippedAt: timestamp("shipped_at"),
    deliveredAt: timestamp("delivered_at"),
    cancelledAt: timestamp("cancelled_at"),
    cancelledReason: text("cancelled_reason"),

    // Notes
    customerNote: text("customer_note"),
    internalNote: text("internal_note"),

    // Metadata
    channel: text("channel").notNull().default("storefront"), // storefront, admin, api
  },
  (table) => [
    uniqueIndex("ecom_orders_org_order_number_idx").on(
      table.organizationId,
      table.orderNumber,
    ),
    index("ecom_orders_org_customer_idx").on(
      table.organizationId,
      table.customerId,
    ),
    index("ecom_orders_org_status_idx").on(table.organizationId, table.status),
    index("ecom_orders_org_payment_status_idx").on(
      table.organizationId,
      table.paymentStatus,
    ),
    index("ecom_orders_org_fulfillment_status_idx").on(
      table.organizationId,
      table.fulfillmentStatus,
    ),
    index("ecom_orders_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("ecom_orders_org_ledger_tx_idx").on(
      table.organizationId,
      table.ledgerTransactionId,
    ),
    index("ecom_orders_org_workflow_idx").on(
      table.organizationId,
      table.workflowInstanceId,
    ),
  ],
);

// Order Items
export const ecomOrderItems = pgTable(
  "ecom_order_items",
  {
    ...baseColumns,
    orderId: text("order_id").notNull(),
    variantId: text("variant_id").notNull(), // FK to cat_variants
    itemId: text("item_id"), // FK to cat_items (optional, for display)

    // Item details (denormalized for order history)
    name: text("name").notNull(),
    sku: text("sku"),
    variantName: text("variant_name"), // e.g., "Blue / Large"
    imageUrl: text("image_url"),

    // Pricing
    currency: text("currency").notNull(),
    ...moneyColumns("unitPrice"),
    ...moneyColumns("total"),

    // Quantity
    quantity: integer("quantity").notNull(),

    // Tax breakdown
    taxRate: integer("tax_rate"), // in basis points (e.g., 1800 = 18%)
    ...moneyColumns("taxAmount"),

    // Discount
    ...moneyColumns("discountAmount"),

    // Metadata
    metadata: jsonb("metadata").notNull().default("{}"),
  },
  (table) => [
    index("ecom_order_items_order_idx").on(table.orderId),
    index("ecom_order_items_org_order_idx").on(
      table.organizationId,
      table.orderId,
    ),
    index("ecom_order_items_variant_idx").on(table.variantId),
    index("ecom_order_items_org_variant_idx").on(
      table.organizationId,
      table.variantId,
    ),
  ],
);

// Order History (Audit Trail)
export const ecomOrderHistory = pgTable(
  "ecom_order_history",
  {
    ...baseColumns,
    orderId: text("order_id").notNull(),
    actorId: text("actor_id"), // Who performed the action (nullable for system)

    // What changed
    event: text("event").notNull(), // e.g., order.placed, payment.received
    previousStatus: orderStatusEnum("previous_status"),
    newStatus: orderStatusEnum("new_status"),

    // Additional details
    description: text("description"), // Human-readable description
    metadata: jsonb("metadata").notNull().default("{}"),
  },
  (table) => [
    index("ecom_order_history_order_idx").on(table.orderId),
    index("ecom_order_history_org_order_idx").on(
      table.organizationId,
      table.orderId,
    ),
    index("ecom_order_history_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("ecom_order_history_event_idx").on(table.event),
  ],
);

// Shopping Carts
export const ecomCarts = pgTable(
  "ecom_carts",
  {
    ...baseColumns,
    customerId: text("customer_id"), // Nullable for guest carts
    sessionId: text("session_id"), // For guest carts (anonymous)

    status: cartStatusEnum("status").notNull().default("active"),

    // Currency
    currency: text("currency").notNull().default("INR"),

    // Coupon
    couponCode: text("coupon_code"),
    couponId: text("coupon_id"),

    // Pricing (calculated)
    ...moneyColumns("subtotal"),
    ...moneyColumns("discount"),
    ...moneyColumns("tax"),
    ...moneyColumns("shippingFee"),
    ...moneyColumns("total"),

    // Metadata
    metadata: jsonb("metadata").notNull().default("{}"),

    // Expires at
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    index("ecom_carts_org_customer_idx").on(
      table.organizationId,
      table.customerId,
    ),
    index("ecom_carts_org_session_idx").on(
      table.organizationId,
      table.sessionId,
    ),
    index("ecom_carts_org_status_idx").on(table.organizationId, table.status),
    index("ecom_carts_org_expires_idx").on(
      table.organizationId,
      table.expiresAt,
    ),
  ],
);

// Cart Items
export const ecomCartItems = pgTable(
  "ecom_cart_items",
  {
    ...baseColumns,
    cartId: text("cart_id").notNull(),
    variantId: text("variant_id").notNull(),
    itemId: text("item_id"),

    // Item details (denormalized)
    name: text("name").notNull(),
    sku: text("sku"),
    variantName: text("variant_name"),
    imageUrl: text("image_url"),

    // Pricing
    currency: text("currency").notNull(),
    ...moneyColumns("unitPrice"),

    // Quantity
    quantity: integer("quantity").notNull().default(1),

    // Tax
    taxRate: integer("tax_rate"),

    // Metadata
    metadata: jsonb("metadata").notNull().default("{}"),
  },
  (table) => [
    index("ecom_cart_items_cart_idx").on(table.cartId),
    index("ecom_cart_items_org_cart_idx").on(
      table.organizationId,
      table.cartId,
    ),
    index("ecom_cart_items_variant_idx").on(table.variantId),
  ],
);

// Coupons
export const ecomCoupons = pgTable(
  "ecom_coupons",
  {
    ...baseColumns,
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),

    type: couponTypeEnum("type").notNull(),
    scope: couponScopeEnum("scope").notNull().default("cart"),

    // Value
    value: integer("value").notNull(), // Percentage (basis points) or fixed amount
    currency: text("currency").notNull().default("INR"),

    // Constraints
    minOrderAmount: integer("min_order_amount"), // Minimum order total to apply
    maxDiscountAmount: integer("max_discount_amount"), // Cap for percentage coupons

    // Usage limits
    usageLimit: integer("usage_limit"), // Total uses allowed
    usageCount: integer("usage_count").notNull().default(0),
    perCustomerLimit: integer("per_customer_limit").notNull().default(1),

    // Target scope (for product/category scope)
    targetVariantIds: jsonb("target_variant_ids").notNull().default("[]"),
    targetCategoryIds: jsonb("target_category_ids").notNull().default("[]"),

    // Validity
    validFrom: timestamp("valid_from"),
    validTo: timestamp("valid_to"),

    // Status
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("ecom_coupons_org_code_idx").on(
      table.organizationId,
      table.code,
    ),
    index("ecom_coupons_org_active_idx").on(
      table.organizationId,
      table.isActive,
    ),
    index("ecom_coupons_org_valid_dates_idx").on(
      table.organizationId,
      table.validFrom,
      table.validTo,
    ),
  ],
);

// Coupon Usage (per customer)
export const ecomCouponUsage = pgTable(
  "ecom_coupon_usage",
  {
    ...baseColumns,
    couponId: text("coupon_id").notNull(),
    actorId: text("actor_id").notNull(), // Customer who used the coupon

    // Usage details
    orderId: text("order_id").notNull(), // Order where coupon was used
    usageCount: integer("usage_count").notNull().default(1),
    discountAmount: integer("discount_amount"), // Total discount given
    discountCurrency: text("discount_currency"),
  },
  (table) => [
    index("ecom_coupon_usage_org_coupon_idx").on(
      table.organizationId,
      table.couponId,
    ),
    index("ecom_coupon_usage_org_actor_idx").on(
      table.organizationId,
      table.actorId,
    ),
    index("ecom_coupon_usage_org_order_idx").on(
      table.organizationId,
      table.orderId,
    ),
    uniqueIndex("ecom_coupon_usage_org_coupon_actor_idx").on(
      table.organizationId,
      table.couponId,
      table.actorId,
    ),
  ],
);

// ============================================
// Type Exports
// ============================================

export type EcomAddress = typeof ecomAddresses.$inferSelect;
export type EcomOrder = typeof ecomOrders.$inferSelect;
export type EcomOrderItem = typeof ecomOrderItems.$inferSelect;
export type EcomOrderHistory = typeof ecomOrderHistory.$inferSelect;
export type EcomCart = typeof ecomCarts.$inferSelect;
export type EcomCartItem = typeof ecomCartItems.$inferSelect;
export type EcomCoupon = typeof ecomCoupons.$inferSelect;
export type EcomCouponUsage = typeof ecomCouponUsage.$inferSelect;
