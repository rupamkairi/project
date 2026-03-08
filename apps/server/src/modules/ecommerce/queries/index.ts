// Ecommerce Queries
// Implements CQRS pattern for ecommerce read operations

import {
  eq,
  and,
  or,
  desc,
  asc,
  sql,
  inArray,
  isNull,
  like,
  gte,
  lte,
} from "drizzle-orm";
import { db } from "../../../infra/db/client";
import {
  ecomOrders,
  ecomOrderItems,
  ecomCarts,
  ecomCartItems,
  ecomCoupons,
  ecomAddresses,
} from "../../../infra/db/schema/ecommerce";
import { catVariants, catItems } from "../../../infra/db/schema/catalog";
import type { ID } from "../../../core/entity";
import type { SystemContext } from "../../../core/cqrs";

// ============================================
// Query Types (Params definitions)
// ============================================

export interface GetOrderParams {
  orderId: ID;
}

export interface ListOrdersParams {
  customerId?: ID;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface GetOrderByCustomerParams {
  customerId: ID;
  limit?: number;
  offset?: number;
}

export interface GetCartParams {
  cartId: ID;
}

export interface GetActiveCartParams {
  customerId?: ID;
  sessionId?: string;
}

export interface ValidateCouponParams {
  couponCode: string;
  cartId?: ID;
  orderTotal?: number;
  variantIds?: ID[];
  categoryIds?: ID[];
}

export interface GetAddressesParams {
  actorId: ID;
  type?: "shipping" | "billing";
}

// ============================================
// Query Handlers
// ============================================

// ecom.getOrder - Get order by ID
export async function getOrder(
  params: GetOrderParams,
  context: SystemContext,
): Promise<unknown> {
  const orgId = context.actor.orgId;

  const [order] = await db
    .select()
    .from(ecomOrders)
    .where(
      and(
        eq(ecomOrders.id, params.orderId),
        eq(ecomOrders.organizationId, orgId),
        isNull(ecomOrders.deletedAt),
      ),
    );

  if (!order) {
    return null;
  }

  // Get order items
  const items = await db
    .select()
    .from(ecomOrderItems)
    .where(
      and(
        eq(ecomOrderItems.orderId, params.orderId),
        eq(ecomOrderItems.organizationId, orgId),
      ),
    );

  // Get shipping and billing addresses if they exist
  let shippingAddress = null;
  let billingAddress = null;

  if (order.shippingAddressId) {
    const [addr] = await db
      .select()
      .from(ecomAddresses)
      .where(eq(ecomAddresses.id, order.shippingAddressId));
    shippingAddress = addr;
  }

  if (order.billingAddressId) {
    const [addr] = await db
      .select()
      .from(ecomAddresses)
      .where(eq(ecomAddresses.id, order.billingAddressId));
    billingAddress = addr;
  }

  return {
    ...order,
    items,
    shippingAddress,
    billingAddress,
  };
}

// ecom.listOrders - List orders with filters
export async function listOrders(
  params: ListOrdersParams,
  context: SystemContext,
): Promise<unknown> {
  const orgId = context.actor.orgId;

  const conditions = [
    eq(ecomOrders.organizationId, orgId),
    isNull(ecomOrders.deletedAt),
  ];

  if (params.customerId) {
    conditions.push(eq(ecomOrders.customerId, params.customerId));
  }

  if (params.status) {
    conditions.push(eq(ecomOrders.status, params.status as any));
  }

  if (params.paymentStatus) {
    conditions.push(eq(ecomOrders.paymentStatus, params.paymentStatus as any));
  }

  if (params.fulfillmentStatus) {
    conditions.push(
      eq(ecomOrders.fulfillmentStatus, params.fulfillmentStatus as any),
    );
  }

  if (params.fromDate) {
    conditions.push(gte(ecomOrders.createdAt, params.fromDate));
  }

  if (params.toDate) {
    conditions.push(lte(ecomOrders.createdAt, params.toDate));
  }

  const limit = params.limit || 20;
  const offset = params.offset || 0;

  const orders = await db
    .select()
    .from(ecomOrders)
    .where(and(...conditions))
    .orderBy(desc(ecomOrders.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(ecomOrders)
    .where(and(...conditions));

  const total = Number(countResult[0]?.count || 0);

  return {
    orders,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + orders.length < total,
    },
  };
}

// ecom.getOrderByCustomer - Get orders for a customer
export async function getOrderByCustomer(
  params: GetOrderByCustomerParams,
  context: SystemContext,
): Promise<unknown> {
  const orgId = context.actor.orgId;

  const limit = params.limit || 20;
  const offset = params.offset || 0;

  const orders = await db
    .select()
    .from(ecomOrders)
    .where(
      and(
        eq(ecomOrders.customerId, params.customerId),
        eq(ecomOrders.organizationId, orgId),
        isNull(ecomOrders.deletedAt),
      ),
    )
    .orderBy(desc(ecomOrders.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(ecomOrders)
    .where(
      and(
        eq(ecomOrders.customerId, params.customerId),
        eq(ecomOrders.organizationId, orgId),
        isNull(ecomOrders.deletedAt),
      ),
    );

  const total = Number(countResult[0]?.count || 0);

  return {
    orders,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + orders.length < total,
    },
  };
}

// ecom.getCart - Get cart by ID
export async function getCart(
  params: GetCartParams,
  context: SystemContext,
): Promise<unknown> {
  const orgId = context.actor.orgId;

  const [cart] = await db
    .select()
    .from(ecomCarts)
    .where(
      and(
        eq(ecomCarts.id, params.cartId),
        eq(ecomCarts.organizationId, orgId),
        isNull(ecomCarts.deletedAt),
      ),
    );

  if (!cart) {
    return null;
  }

  // Get cart items with variant details
  const items = await db
    .select()
    .from(ecomCartItems)
    .where(
      and(
        eq(ecomCartItems.cartId, params.cartId),
        eq(ecomCartItems.organizationId, orgId),
        isNull(ecomCartItems.deletedAt),
      ),
    );

  // Get coupon details if applied
  let coupon = null;
  if (cart.couponId) {
    const [cpn] = await db
      .select()
      .from(ecomCoupons)
      .where(eq(ecomCoupons.id, cart.couponId));
    coupon = cpn;
  }

  return {
    ...cart,
    items,
    coupon,
  };
}

// ecom.getActiveCart - Get active cart for customer/guest
export async function getActiveCart(
  params: GetActiveCartParams,
  context: SystemContext,
): Promise<unknown> {
  const orgId = context.actor.orgId;

  let cart = null;

  if (params.customerId) {
    // First try to find active cart by customerId
    [cart] = await db
      .select()
      .from(ecomCarts)
      .where(
        and(
          eq(ecomCarts.customerId, params.customerId),
          eq(ecomCarts.organizationId, orgId),
          eq(ecomCarts.status, "active"),
          isNull(ecomCarts.deletedAt),
        ),
      );
  }

  // If no cart by customerId, try by sessionId
  if (!cart && params.sessionId) {
    [cart] = await db
      .select()
      .from(ecomCarts)
      .where(
        and(
          eq(ecomCarts.sessionId, params.sessionId),
          eq(ecomCarts.organizationId, orgId),
          eq(ecomCarts.status, "active"),
          isNull(ecomCarts.deletedAt),
        ),
      );
  }

  if (!cart) {
    return null;
  }

  // Get cart items
  const items = await db
    .select()
    .from(ecomCartItems)
    .where(
      and(
        eq(ecomCartItems.cartId, cart.id),
        eq(ecomCartItems.organizationId, orgId),
        isNull(ecomCartItems.deletedAt),
      ),
    );

  // Get coupon details if applied
  let coupon = null;
  if (cart.couponId) {
    const [cpn] = await db
      .select()
      .from(ecomCoupons)
      .where(eq(ecomCoupons.id, cart.couponId));
    coupon = cpn;
  }

  return {
    ...cart,
    items,
    coupon,
  };
}

// ecom.validateCoupon - Validate coupon applicability
export async function validateCoupon(
  params: ValidateCouponParams,
  context: SystemContext,
): Promise<unknown> {
  const orgId = context.actor.orgId;

  // Get coupon
  const [coupon] = await db
    .select()
    .from(ecomCoupons)
    .where(
      and(
        eq(ecomCoupons.code, params.couponCode),
        eq(ecomCoupons.organizationId, orgId),
        eq(ecomCoupons.isActive, true),
        isNull(ecomCoupons.deletedAt),
      ),
    );

  if (!coupon) {
    return {
      valid: false,
      error: "Coupon not found or inactive",
    };
  }

  // Check validity dates
  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    return {
      valid: false,
      error: "Coupon is not yet valid",
      coupon,
    };
  }

  if (coupon.validTo && now > coupon.validTo) {
    return {
      valid: false,
      error: "Coupon has expired",
      coupon,
    };
  }

  // Check usage limit
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return {
      valid: false,
      error: "Coupon usage limit exceeded",
      coupon,
    };
  }

  // Check minimum order amount
  const orderTotal = params.orderTotal || 0;
  if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
    return {
      valid: false,
      error: `Minimum order amount of ${coupon.minOrderAmount / 100} required`,
      coupon,
    };
  }

  // Check product/category scope if applicable
  if (
    coupon.scope === "product" &&
    params.variantIds &&
    params.variantIds.length > 0
  ) {
    const targetVariantIds = (coupon.targetVariantIds || []) as string[];
    if (targetVariantIds.length > 0) {
      const hasMatchingVariant = params.variantIds.some((id) =>
        targetVariantIds.includes(id),
      );
      if (!hasMatchingVariant) {
        return {
          valid: false,
          error: "Coupon does not apply to items in cart",
          coupon,
        };
      }
    }
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (coupon.type === "percentage") {
    discountAmount = Math.round((orderTotal * coupon.value) / 10000);
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }
  } else if (coupon.type === "fixed") {
    discountAmount = Math.min(coupon.value, orderTotal);
  }

  return {
    valid: true,
    coupon,
    discountAmount,
    message: "Coupon is valid",
  };
}

// ecom.getAddresses - Get customer addresses
export async function getAddresses(
  params: GetAddressesParams,
  context: SystemContext,
): Promise<unknown> {
  const orgId = context.actor.orgId;

  let conditions = [
    eq(ecomAddresses.actorId, params.actorId),
    eq(ecomAddresses.organizationId, orgId),
    isNull(ecomAddresses.deletedAt),
  ];

  if (params.type) {
    conditions.push(eq(ecomAddresses.type, params.type));
  }

  const addresses = await db
    .select()
    .from(ecomAddresses)
    .where(and(...conditions))
    .orderBy(desc(ecomAddresses.isDefault), asc(ecomAddresses.createdAt));

  return {
    addresses,
  };
}
