// Ecommerce Entities
// Re-exports of database schema types for the ecommerce module

// Schema tables
export {
  ecomAddresses,
  ecomOrders,
  ecomOrderItems,
  ecomOrderHistory,
  ecomCarts,
  ecomCartItems,
  ecomCoupons,
  ecomCouponUsage,
} from "../../../infra/db/schema/ecommerce";

// Schema enums
export {
  orderStatusEnum,
  paymentStatusEnum,
  fulfillmentStatusEnum,
  couponTypeEnum,
  couponScopeEnum,
  cartStatusEnum,
} from "../../../infra/db/schema/ecommerce";

// Type exports from schema
export type {
  EcomAddress,
  EcomOrder,
  EcomOrderItem,
  EcomOrderHistory,
  EcomCart,
  EcomCartItem,
  EcomCoupon,
  EcomCouponUsage,
} from "../../../infra/db/schema/ecommerce";

// Additional entity types for the domain

// Order related types
export interface OrderAddress {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderItemDetails {
  variantId: string;
  itemId?: string;
  name: string;
  sku?: string;
  variantName?: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  currency: string;
}

export interface OrderPricing {
  subtotal: number;
  discount: number;
  tax: number;
  shippingFee: number;
  total: number;
  currency: string;
}

export interface OrderDetails {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  shippingAddress?: OrderAddress;
  billingAddress?: OrderAddress;
  pricing: OrderPricing;
  couponCode?: string;
  items: OrderItemDetails[];
  gatewayRef?: string;
  paymentUrl?: string;
  gateway?: string;
  ledgerTransactionId?: string;
  workflowInstanceId?: string;
  confirmedAt?: Date;
  processingAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelledReason?: string;
  customerNote?: string;
  internalNote?: string;
  channel: string;
  createdAt: Date;
  updatedAt: Date;
}

// Cart related types
export interface CartItemDetails {
  variantId: string;
  itemId?: string;
  name: string;
  sku?: string;
  variantName?: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  taxRate?: number;
  total: number;
  currency: string;
}

export interface CartPricing {
  subtotal: number;
  discount: number;
  tax: number;
  shippingFee: number;
  total: number;
  currency: string;
}

export interface CartDetails {
  id: string;
  customerId?: string;
  sessionId?: string;
  status: string;
  currency: string;
  couponCode?: string;
  couponId?: string;
  items: CartItemDetails[];
  pricing: CartPricing;
  metadata: Record<string, unknown>;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Coupon related types
export interface CouponDetails {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: "percentage" | "fixed" | "shipping";
  scope: "cart" | "product" | "category" | "shipping";
  value: number;
  currency: string;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageCount: number;
  perCustomerLimit: number;
  targetVariantIds: string[];
  targetCategoryIds: string[];
  validFrom?: Date;
  validTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponDetails;
  discountAmount?: number;
  message?: string;
}

// Address related types
export interface AddressDetails {
  id: string;
  actorId: string;
  type: "shipping" | "billing";
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
