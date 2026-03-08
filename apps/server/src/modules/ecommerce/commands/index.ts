// Ecommerce Commands
// Implements CQRS pattern for ecommerce operations

import { eq, and, or, desc, asc, sql, inArray, isNull } from "drizzle-orm";
import { db } from "../../../infra/db/client";
import {
  ecomOrders,
  ecomOrderItems,
  ecomOrderHistory,
  ecomCarts,
  ecomCartItems,
  ecomCoupons,
  ecomCouponUsage,
  ecomAddresses,
} from "../../../infra/db/schema/ecommerce";
import { catVariants, catItems } from "../../../infra/db/schema/catalog";
import { invStockUnits } from "../../../infra/db/schema/inventory";
import { generateId } from "../../../core/entity";
import type { ID } from "../../../core/entity";
import type { SystemContext } from "../../../core/cqrs";

// ============================================
// Command Types (Payload definitions)
// ============================================

// Order Commands
export interface CreateOrderCommand {
  cartId: ID;
  shippingAddressId?: ID;
  billingAddressId?: ID;
  customerNote?: string;
}

export interface UpdateOrderCommand {
  orderId: ID;
  shippingAddressId?: ID;
  billingAddressId?: ID;
  customerNote?: string;
  internalNote?: string;
}

export interface CancelOrderCommand {
  orderId: ID;
  reason: string;
}

export interface PlaceOrderCommand {
  orderId: ID;
}

export interface ConfirmPaymentCommand {
  orderId: ID;
  gatewayRef?: string;
}

export interface FailPaymentCommand {
  orderId: ID;
  reason: string;
}

export type OrderStatus =
  | "pending_payment"
  | "payment_failed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface UpdateOrderStatusCommand {
  orderId: ID;
  status: OrderStatus;
}

export interface RequestRefundCommand {
  orderId: ID;
  amount?: number;
  reason: string;
}

export interface ProcessRefundCommand {
  orderId: ID;
  refundId: ID;
}

// Cart Commands
export interface CreateCartCommand {
  organizationId: ID;
  customerId?: ID;
  sessionId?: string;
}

export interface AddToCartCommand {
  organizationId: ID;
  cartId: ID;
  variantId: ID;
  quantity: number;
}

export interface UpdateCartItemCommand {
  cartId: ID;
  itemId: ID;
  quantity: number;
}

export interface RemoveFromCartCommand {
  cartId: ID;
  itemId: ID;
}

export interface ApplyCouponCommand {
  cartId: ID;
  couponCode: string;
}

export interface RemoveCouponCommand {
  cartId: ID;
}

export interface ConvertCartCommand {
  organizationId: ID;
  cartId: ID;
  shippingAddressId: ID;
  billingAddressId?: ID;
  customerNote?: string;
}

// Coupon Commands
export interface CreateCouponCommand {
  organizationId: ID;
  code: string;
  name: string;
  description?: string;
  type: "percentage" | "fixed" | "shipping";
  scope: "cart" | "product" | "category" | "shipping";
  value: number;
  currency?: string;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  targetVariantIds?: ID[];
  targetCategoryIds?: ID[];
  validFrom?: Date;
  validTo?: Date;
}

export interface UpdateCouponCommand {
  organizationId: ID;
  couponId: ID;
  name?: string;
  description?: string;
  value?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  targetVariantIds?: ID[];
  targetCategoryIds?: ID[];
  validFrom?: Date;
  validTo?: Date;
  isActive?: boolean;
}

export interface DeleteCouponCommand {
  organizationId: ID;
  couponId: ID;
}

// Address Commands
export interface CreateAddressCommand {
  organizationId: ID;
  actorId: ID;
  type: "shipping" | "billing";
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  phone?: string;
}

export interface UpdateAddressCommand {
  organizationId: ID;
  addressId: ID;
  firstName?: string;
  lastName?: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

export interface DeleteAddressCommand {
  organizationId: ID;
  addressId: ID;
}

export interface SetDefaultAddressCommand {
  organizationId: ID;
  addressId: ID;
  actorId: ID;
  type: "shipping" | "billing";
}

// ============================================
// Helper Functions
// ============================================

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

async function addOrderHistory(
  organizationId: ID,
  orderId: ID,
  actorId: ID | null,
  event: string,
  previousStatus: OrderStatus | null,
  newStatus: OrderStatus,
  description?: string,
) {
  await db.insert(ecomOrderHistory).values({
    id: generateId(),
    organizationId,
    orderId,
    actorId: actorId || null,
    event,
    previousStatus,
    newStatus,
    description: description || null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  });
}

// ============================================
// Command Handlers
// ============================================

// ecom.createOrder - Create a new order from cart
export async function createOrder(
  payload: CreateOrderCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = context.actor.orgId;
  const actorId = context.actor.id;

  const [cart] = await db
    .select()
    .from(ecomCarts)
    .where(
      and(
        eq(ecomCarts.id, payload.cartId),
        eq(ecomCarts.organizationId, orgId),
        eq(ecomCarts.status, "active"),
        isNull(ecomCarts.deletedAt),
      ),
    );

  if (!cart) {
    throw new Error("Cart not found or not active");
  }

  const cartItems = await db
    .select()
    .from(ecomCartItems)
    .where(
      and(
        eq(ecomCartItems.cartId, payload.cartId),
        eq(ecomCartItems.organizationId, orgId),
        isNull(ecomCartItems.deletedAt),
      ),
    );

  if (cartItems.length === 0) {
    throw new Error("Cart is empty");
  }

  const variantIds = cartItems.map((item) => item.variantId);
  const variants = await db
    .select()
    .from(catVariants)
    .where(inArray(catVariants.id, variantIds));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const itemIds = variants.map((v) => v.itemId).filter(Boolean) as string[];
  const items = await db
    .select()
    .from(catItems)
    .where(inArray(catItems.id, itemIds));
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const orderId = generateId();
  const orderNumber = generateOrderNumber();
  const now = new Date();
  const cartAny = cart as unknown as Record<string, unknown>;

  // Use raw SQL for insert with money columns
  await db.execute(sql`
    INSERT INTO ecom_orders (
      id, organization_id, order_number, customer_id, status, payment_status, 
      fulfillment_status, shipping_address_id, billing_address_id, currency,
      subtotal_amount, subtotal_currency, discount_amount, discount_currency,
      tax_amount, tax_currency, shipping_fee_amount, shipping_fee_currency,
      total_amount, total_currency, coupon_code, customer_note, channel,
      created_at, updated_at, version
    ) VALUES (
      ${orderId}, ${orgId}, ${orderNumber}, ${cart.customerId || actorId}, 
      'pending_payment', 'pending', 'not_started', ${payload.shippingAddressId || null},
      ${payload.billingAddressId || null}, ${cart.currency || "INR"},
      ${(cartAny.subtotalAmount as number) || 0}, 'INR',
      ${(cartAny.discountAmount as number) || 0}, 'INR',
      ${(cartAny.taxAmount as number) || 0}, 'INR',
      ${(cartAny.shippingFeeAmount as number) || 0}, 'INR',
      ${(cartAny.totalAmount as number) || 0}, 'INR',
      ${cart.couponCode || null}, ${payload.customerNote || null}, 'storefront',
      ${now}, ${now}, 1
    )
  `);

  // Create order items
  for (const cartItem of cartItems) {
    const variant = variantMap.get(cartItem.variantId);
    const itemAny = cartItem as unknown as Record<string, unknown>;
    const unitPrice = (itemAny.unitPriceAmount as number) || 0;
    const qty = cartItem.quantity;
    const taxRate = (itemAny.taxRate as number) || 0;
    const total = unitPrice * qty;
    const taxAmount = Math.round((total * taxRate) / 10000);

    await db.execute(sql`
      INSERT INTO ecom_order_items (
        id, organization_id, order_id, variant_id, item_id, name, sku, 
        variant_name, image_url, currency, unit_price_amount, total_amount,
        quantity, tax_rate, tax_amount, discount_amount, metadata,
        created_at, updated_at, version
      ) VALUES (
        ${generateId()}, ${orgId}, ${orderId}, ${cartItem.variantId},
        ${cartItem.itemId || null}, ${cartItem.name}, ${cartItem.sku || null},
        ${cartItem.variantName || null}, ${cartItem.imageUrl || null},
        ${cartItem.currency}, ${unitPrice}, ${total}, ${qty},
        ${taxRate}, ${taxAmount}, 0, '{}',
        ${now}, ${now}, 1
      )
    `);
  }

  // Update cart status
  await db
    .update(ecomCarts)
    .set({ status: "converted", updatedAt: now })
    .where(eq(ecomCarts.id, payload.cartId));

  await addOrderHistory(
    orgId,
    orderId,
    actorId,
    "order.created",
    null,
    "pending_payment",
    "Order created from cart",
  );

  return { id: orderId };
}

// ecom.updateOrder - Update order details
export async function updateOrder(
  payload: UpdateOrderCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = context.actor.orgId;

  const [existing] = await db
    .select()
    .from(ecomOrders)
    .where(
      and(
        eq(ecomOrders.id, payload.orderId),
        eq(ecomOrders.organizationId, orgId),
        isNull(ecomOrders.deletedAt),
      ),
    );

  if (!existing) {
    throw new Error("Order not found");
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (payload.shippingAddressId)
    updates.shippingAddressId = payload.shippingAddressId;
  if (payload.billingAddressId)
    updates.billingAddressId = payload.billingAddressId;
  if (payload.customerNote) updates.customerNote = payload.customerNote;
  if (payload.internalNote) updates.internalNote = payload.internalNote;

  await db
    .update(ecomOrders)
    .set(updates)
    .where(eq(ecomOrders.id, payload.orderId));
  return { id: payload.orderId };
}

// ecom.cancelOrder - Cancel an order
export async function cancelOrder(
  payload: CancelOrderCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = context.actor.orgId;
  const actorId = context.actor.id;

  const [existing] = await db
    .select()
    .from(ecomOrders)
    .where(
      and(
        eq(ecomOrders.id, payload.orderId),
        eq(ecomOrders.organizationId, orgId),
        isNull(ecomOrders.deletedAt),
      ),
    );

  if (!existing) {
    throw new Error("Order not found");
  }

  const cancellableStatuses = ["pending_payment", "confirmed", "processing"];
  if (!cancellableStatuses.includes(existing.status)) {
    throw new Error(`Cannot cancel order with status: ${existing.status}`);
  }

  const previousStatus = existing.status;
  await db
    .update(ecomOrders)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledReason: payload.reason,
      updatedAt: new Date(),
    })
    .where(eq(ecomOrders.id, payload.orderId));

  await addOrderHistory(
    orgId,
    payload.orderId,
    actorId,
    "order.cancelled",
    previousStatus as OrderStatus,
    "cancelled",
    `Order cancelled: ${payload.reason}`,
  );
  return { id: payload.orderId };
}

// ecom.placeOrder - Finalize and place an order
export async function placeOrder(
  payload: PlaceOrderCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = context.actor.orgId;
  const actorId = context.actor.id;

  const [existing] = await db
    .select()
    .from(ecomOrders)
    .where(
      and(
        eq(ecomOrders.id, payload.orderId),
        eq(ecomOrders.organizationId, orgId),
        isNull(ecomOrders.deletedAt),
      ),
    );

  if (!existing) {
    throw new Error("Order not found");
  }

  if (existing.status !== "pending_payment") {
    throw new Error("Order is not in pending payment status");
  }

  const orderItems = await db
    .select()
    .from(ecomOrderItems)
    .where(
      and(
        eq(ecomOrderItems.orderId, payload.orderId),
        eq(ecomOrderItems.organizationId, orgId),
      ),
    );

  for (const item of orderItems) {
    const [stock] = await db
      .select()
      .from(invStockUnits)
      .where(
        and(
          eq(invStockUnits.variantId, item.variantId),
          eq(invStockUnits.organizationId, orgId),
        ),
      );

    if (stock) {
      const available = stock.onHand - stock.reserved;
      if (available < item.quantity) {
        throw new Error(`Insufficient stock for item: ${item.name}`);
      }
      await db
        .update(invStockUnits)
        .set({
          reserved: stock.reserved + item.quantity,
          updatedAt: new Date(),
        })
        .where(eq(invStockUnits.id, stock.id));
    }
  }

  const previousStatus = existing.status;
  await db
    .update(ecomOrders)
    .set({
      status: "confirmed",
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ecomOrders.id, payload.orderId));

  await addOrderHistory(
    orgId,
    payload.orderId,
    actorId,
    "order.placed",
    previousStatus,
    "confirmed",
    "Order placed and inventory reserved",
  );
  return { id: payload.orderId };
}

// ecom.confirmPayment - Mark payment as received
export async function confirmPayment(
  payload: ConfirmPaymentCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = context.actor.orgId;
  const actorId = context.actor.id;

  const [existing] = await db
    .select()
    .from(ecomOrders)
    .where(
      and(
        eq(ecomOrders.id, payload.orderId),
        eq(ecomOrders.organizationId, orgId),
        isNull(ecomOrders.deletedAt),
      ),
    );

  if (!existing) {
    throw new Error("Order not found");
  }

  if (existing.paymentStatus !== "pending") {
    throw new Error("Payment is not in pending status");
  }

  const previousStatus = existing.status;
  await db
    .update(ecomOrders)
    .set({
      paymentStatus: "captured",
      status: "confirmed",
      gatewayRef: payload.gatewayRef,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ecomOrders.id, payload.orderId));

  await addOrderHistory(
    orgId,
    payload.orderId,
    actorId,
    "payment.received",
    previousStatus,
    "confirmed",
    `Payment confirmed${payload.gatewayRef ? ` (Ref: ${payload.gatewayRef})` : ""}`,
  );
  return { id: payload.orderId };
}

// ecom.failPayment - Mark payment as failed
export async function failPayment(
  payload: FailPaymentCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = context.actor.orgId;
  const actorId = context.actor.id;

  const [existing] = await db
    .select()
    .from(ecomOrders)
    .where(
      and(
        eq(ecomOrders.id, payload.orderId),
        eq(ecomOrders.organizationId, orgId),
        isNull(ecomOrders.deletedAt),
      ),
    );

  if (!existing) {
    throw new Error("Order not found");
  }

  const previousStatus = existing.status;
  await db
    .update(ecomOrders)
    .set({
      paymentStatus: "failed",
      status: "payment_failed",
      updatedAt: new Date(),
    })
    .where(eq(ecomOrders.id, payload.orderId));

  const orderItems = await db
    .select()
    .from(ecomOrderItems)
    .where(
      and(
        eq(ecomOrderItems.orderId, payload.orderId),
        eq(ecomOrderItems.organizationId, orgId),
      ),
    );

  for (const item of orderItems) {
    const [stock] = await db
      .select()
      .from(invStockUnits)
      .where(
        and(
          eq(invStockUnits.variantId, item.variantId),
          eq(invStockUnits.organizationId, orgId),
        ),
      );

    if (stock && stock.reserved >= item.quantity) {
      await db
        .update(invStockUnits)
        .set({
          reserved: stock.reserved - item.quantity,
          updatedAt: new Date(),
        })
        .where(eq(invStockUnits.id, stock.id));
    }
  }

  await addOrderHistory(
    orgId,
    payload.orderId,
    actorId,
    "payment.failed",
    previousStatus,
    "payment_failed",
    `Payment failed: ${payload.reason}`,
  );
  return { id: payload.orderId };
}

// ecom.updateOrderStatus - Manually update order status
export async function updateOrderStatus(
  payload: UpdateOrderStatusCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = context.actor.orgId;
  const actorId = context.actor.id;

  const [existing] = await db
    .select()
    .from(ecomOrders)
    .where(
      and(
        eq(ecomOrders.id, payload.orderId),
        eq(ecomOrders.organizationId, orgId),
        isNull(ecomOrders.deletedAt),
      ),
    );

  if (!existing) {
    throw new Error("Order not found");
  }

  const previousStatus = existing.status;
  const updates: Record<string, unknown> = {
    status: payload.status,
    updatedAt: new Date(),
  };

  if (payload.status === "confirmed") updates.confirmedAt = new Date();
  else if (payload.status === "processing") updates.processingAt = new Date();
  else if (payload.status === "shipped") updates.shippedAt = new Date();
  else if (payload.status === "delivered") updates.deliveredAt = new Date();

  await db
    .update(ecomOrders)
    .set(updates)
    .where(eq(ecomOrders.id, payload.orderId));
  await addOrderHistory(
    orgId,
    payload.orderId,
    actorId,
    `order.${payload.status}`,
    previousStatus,
    payload.status,
    `Order status updated to ${payload.status}`,
  );
  return { id: payload.orderId };
}

// ecom.requestRefund - Request a refund
export async function requestRefund(
  payload: RequestRefundCommand,
  _context: SystemContext,
): Promise<{ id: ID }> {
  return { id: payload.orderId };
}

// ecom.processRefund - Process a refund
export async function processRefund(
  payload: ProcessRefundCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = context.actor.orgId;
  const actorId = context.actor.id;

  const [existing] = await db
    .select()
    .from(ecomOrders)
    .where(
      and(
        eq(ecomOrders.id, payload.orderId),
        eq(ecomOrders.organizationId, orgId),
        isNull(ecomOrders.deletedAt),
      ),
    );

  if (!existing) {
    throw new Error("Order not found");
  }

  const previousStatus = existing.status;
  await db
    .update(ecomOrders)
    .set({
      paymentStatus: "refunded",
      status: "refunded",
      updatedAt: new Date(),
    })
    .where(eq(ecomOrders.id, payload.orderId));

  await addOrderHistory(
    orgId,
    payload.orderId,
    actorId,
    "order.refunded",
    previousStatus,
    "refunded",
    "Refund processed",
  );
  return { id: payload.orderId };
}

// ecom.createCart - Create a new cart
export async function createCart(
  payload: CreateCartCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = payload.organizationId || context.actor.orgId;
  const cartId = generateId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await db.execute(sql`
    INSERT INTO ecom_carts (
      id, organization_id, customer_id, session_id, status, currency,
      subtotal_amount, subtotal_currency, discount_amount, discount_currency,
      tax_amount, tax_currency, shipping_fee_amount, shipping_fee_currency,
      total_amount, total_currency, metadata, expires_at,
      created_at, updated_at, version
    ) VALUES (
      ${cartId}, ${orgId}, ${payload.customerId || null}, ${payload.sessionId || null},
      'active', 'INR', 0, 'INR', 0, 'INR', 0, 'INR', 0, 'INR', 0, 'INR',
      '{}', ${expiresAt}, ${now}, ${now}, 1
    )
  `);

  return { id: cartId };
}

// ecom.addToCart - Add item to cart
export async function addToCart(
  payload: AddToCartCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = payload.organizationId || context.actor.orgId;

  const [cart] = await db
    .select()
    .from(ecomCarts)
    .where(
      and(
        eq(ecomCarts.id, payload.cartId),
        eq(ecomCarts.organizationId, orgId),
        eq(ecomCarts.status, "active"),
        isNull(ecomCarts.deletedAt),
      ),
    );

  if (!cart) {
    throw new Error("Cart not found or not active");
  }

  const [variant] = await db
    .select()
    .from(catVariants)
    .where(
      and(
        eq(catVariants.id, payload.variantId),
        eq(catVariants.organizationId, orgId),
      ),
    );

  if (!variant) {
    throw new Error("Variant not found");
  }

  let itemName = "Unknown Item";
  let itemImageUrl: string | null = null;

  if (variant.itemId) {
    const [item] = await db
      .select()
      .from(catItems)
      .where(eq(catItems.id, variant.itemId));
    if (item) {
      itemName = item.name;
      if (item.media && Array.isArray(item.media) && item.media.length > 0) {
        const mediaItem = item.media[0] as { url?: string };
        itemImageUrl = mediaItem.url || null;
      }
    }
  }

  const [existingItem] = await db
    .select()
    .from(ecomCartItems)
    .where(
      and(
        eq(ecomCartItems.cartId, payload.cartId),
        eq(ecomCartItems.variantId, payload.variantId),
        eq(ecomCartItems.organizationId, orgId),
        isNull(ecomCartItems.deletedAt),
      ),
    );

  const now = new Date();
  let itemId: ID;

  if (existingItem) {
    itemId = existingItem.id;
    await db
      .update(ecomCartItems)
      .set({
        quantity: existingItem.quantity + payload.quantity,
        updatedAt: now,
      })
      .where(eq(ecomCartItems.id, existingItem.id));
  } else {
    itemId = generateId();
    let variantNameValue: string | null = null;
    if (variant.attributes) {
      const attrs = variant.attributes as Record<string, unknown>;
      const values = Object.values(attrs);
      if (values.length > 0) variantNameValue = values.join(" / ");
    }

    await db.execute(sql`
      INSERT INTO ecom_cart_items (
        id, organization_id, cart_id, variant_id, item_id, name, sku,
        variant_name, image_url, currency, unit_price_amount, quantity,
        tax_rate, metadata, created_at, updated_at, version
      ) VALUES (
        ${itemId}, ${orgId}, ${payload.cartId}, ${payload.variantId},
        ${variant.itemId || null}, ${itemName}, ${variant.sku || null},
        ${variantNameValue}, ${itemImageUrl}, 'INR', 0, ${payload.quantity},
        1800, '{}', ${now}, ${now}, 1
      )
    `);
  }

  return { id: itemId };
}

// ecom.updateCartItem - Update cart item quantity
export async function updateCartItem(
  payload: UpdateCartItemCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = context.actor.orgId;

  const [existing] = await db
    .select()
    .from(ecomCartItems)
    .where(
      and(
        eq(ecomCartItems.id, payload.itemId),
        eq(ecomCartItems.cartId, payload.cartId),
        eq(ecomCartItems.organizationId, orgId),
        isNull(ecomCartItems.deletedAt),
      ),
    );

  if (!existing) {
    throw new Error("Cart item not found");
  }

  if (payload.quantity <= 0) {
    await db
      .update(ecomCartItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(ecomCartItems.id, payload.itemId));
  } else {
    await db
      .update(ecomCartItems)
      .set({ quantity: payload.quantity, updatedAt: new Date() })
      .where(eq(ecomCartItems.id, payload.itemId));
  }

  return { id: payload.itemId };
}

// ecom.removeFromCart - Remove item from cart
export async function removeFromCart(
  payload: RemoveFromCartCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = context.actor.orgId;

  const [existing] = await db
    .select()
    .from(ecomCartItems)
    .where(
      and(
        eq(ecomCartItems.id, payload.itemId),
        eq(ecomCartItems.cartId, payload.cartId),
        eq(ecomCartItems.organizationId, orgId),
        isNull(ecomCartItems.deletedAt),
      ),
    );

  if (!existing) {
    throw new Error("Cart item not found");
  }

  await db
    .update(ecomCartItems)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(ecomCartItems.id, payload.itemId));
  return { id: payload.itemId };
}

// ecom.applyCoupon - Apply coupon to cart
export async function applyCoupon(
  payload: ApplyCouponCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = context.actor.orgId;

  const [cart] = await db
    .select()
    .from(ecomCarts)
    .where(
      and(
        eq(ecomCarts.id, payload.cartId),
        eq(ecomCarts.organizationId, orgId),
        isNull(ecomCarts.deletedAt),
      ),
    );

  if (!cart) {
    throw new Error("Cart not found");
  }

  const [coupon] = await db
    .select()
    .from(ecomCoupons)
    .where(
      and(
        eq(ecomCoupons.code, payload.couponCode),
        eq(ecomCoupons.organizationId, orgId),
        eq(ecomCoupons.isActive, true),
        isNull(ecomCoupons.deletedAt),
      ),
    );

  if (!coupon) {
    throw new Error("Coupon not found or inactive");
  }

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) {
    throw new Error("Coupon is not yet valid");
  }
  if (coupon.validTo && now > coupon.validTo) {
    throw new Error("Coupon has expired");
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    throw new Error("Coupon usage limit exceeded");
  }

  const cartAny = cart as unknown as Record<string, unknown>;
  const subtotal = (cartAny.subtotalAmount as number) || 0;
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    throw new Error(
      `Minimum order amount of ${coupon.minOrderAmount / 100} required`,
    );
  }

  await db
    .update(ecomCarts)
    .set({
      couponId: coupon.id,
      couponCode: coupon.code,
      updatedAt: new Date(),
    })
    .where(eq(ecomCarts.id, payload.cartId));
  return { id: coupon.id };
}

// ecom.removeCoupon - Remove coupon from cart
export async function removeCoupon(
  payload: RemoveCouponCommand,
  _context: SystemContext,
): Promise<{ id: ID }> {
  await db
    .update(ecomCarts)
    .set({ couponId: null, couponCode: null, updatedAt: new Date() })
    .where(eq(ecomCarts.id, payload.cartId));
  return { id: payload.cartId };
}

// ecom.convertCart - Convert cart to order
export async function convertCart(
  payload: ConvertCartCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = payload.organizationId || context.actor.orgId;
  const actorId = context.actor.id;

  const [cart] = await db
    .select()
    .from(ecomCarts)
    .where(
      and(
        eq(ecomCarts.id, payload.cartId),
        eq(ecomCarts.organizationId, orgId),
        eq(ecomCarts.status, "active"),
        isNull(ecomCarts.deletedAt),
      ),
    );

  if (!cart) {
    throw new Error("Cart not found or not active");
  }

  const cartItems = await db
    .select()
    .from(ecomCartItems)
    .where(
      and(
        eq(ecomCartItems.cartId, payload.cartId),
        eq(ecomCartItems.organizationId, orgId),
        isNull(ecomCartItems.deletedAt),
      ),
    );

  if (cartItems.length === 0) {
    throw new Error("Cart is empty");
  }

  const orderId = generateId();
  const orderNumber = generateOrderNumber();
  const now = new Date();
  const cartAny = cart as unknown as Record<string, unknown>;

  await db.execute(sql`
    INSERT INTO ecom_orders (
      id, organization_id, order_number, customer_id, status, payment_status,
      fulfillment_status, shipping_address_id, billing_address_id, currency,
      subtotal_amount, subtotal_currency, discount_amount, discount_currency,
      tax_amount, tax_currency, shipping_fee_amount, shipping_fee_currency,
      total_amount, total_currency, coupon_code, customer_note, channel,
      created_at, updated_at, version
    ) VALUES (
      ${orderId}, ${orgId}, ${orderNumber}, ${cart.customerId || actorId},
      'pending_payment', 'pending', 'not_started', ${payload.shippingAddressId},
      ${payload.billingAddressId || null}, ${cart.currency || "INR"},
      ${(cartAny.subtotalAmount as number) || 0}, 'INR',
      ${(cartAny.discountAmount as number) || 0}, 'INR',
      ${(cartAny.taxAmount as number) || 0}, 'INR',
      ${(cartAny.shippingFeeAmount as number) || 0}, 'INR',
      ${(cartAny.totalAmount as number) || 0}, 'INR',
      ${cart.couponCode || null}, ${payload.customerNote || null}, 'storefront',
      ${now}, ${now}, 1
    )
  `);

  for (const cartItem of cartItems) {
    const itemAny = cartItem as unknown as Record<string, unknown>;
    const unitPrice = (itemAny.unitPriceAmount as number) || 0;
    const qty = cartItem.quantity;
    const taxRate = (itemAny.taxRate as number) || 0;
    const total = unitPrice * qty;
    const taxAmount = Math.round((total * taxRate) / 10000);

    await db.execute(sql`
      INSERT INTO ecom_order_items (
        id, organization_id, order_id, variant_id, item_id, name, sku,
        variant_name, image_url, currency, unit_price_amount, total_amount,
        quantity, tax_rate, tax_amount, discount_amount, metadata,
        created_at, updated_at, version
      ) VALUES (
        ${generateId()}, ${orgId}, ${orderId}, ${cartItem.variantId},
        ${cartItem.itemId || null}, ${cartItem.name}, ${cartItem.sku || null},
        ${cartItem.variantName || null}, ${cartItem.imageUrl || null},
        ${cartItem.currency}, ${unitPrice}, ${total}, ${qty},
        ${taxRate}, ${taxAmount}, 0, '{}',
        ${now}, ${now}, 1
      )
    `);
  }

  await db
    .update(ecomCarts)
    .set({ status: "converted", updatedAt: now })
    .where(eq(ecomCarts.id, payload.cartId));

  if (cart.couponId && cart.customerId) {
    await db.insert(ecomCouponUsage).values({
      id: generateId(),
      organizationId: orgId,
      couponId: cart.couponId,
      actorId: cart.customerId,
      orderId,
      usageCount: 1,
      discountAmount: (cartAny.discountAmount as number) || 0,
      discountCurrency: (cartAny.discountCurrency as string) || "INR",
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    await db
      .update(ecomCoupons)
      .set({ usageCount: sql`${ecomCoupons.usageCount} + 1`, updatedAt: now })
      .where(eq(ecomCoupons.id, cart.couponId));
  }

  await addOrderHistory(
    orgId,
    orderId,
    actorId,
    "order.created",
    null,
    "pending_payment",
    "Order created from cart conversion",
  );
  return { id: orderId };
}

// ecom.createCoupon - Create a new coupon
export async function createCoupon(
  payload: CreateCouponCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = payload.organizationId || context.actor.orgId;
  const couponId = generateId();
  const now = new Date();

  const [existing] = await db
    .select()
    .from(ecomCoupons)
    .where(
      and(
        eq(ecomCoupons.code, payload.code),
        eq(ecomCoupons.organizationId, orgId),
        isNull(ecomCoupons.deletedAt),
      ),
    );

  if (existing) {
    throw new Error("Coupon code already exists");
  }

  await db.insert(ecomCoupons).values({
    id: couponId,
    organizationId: orgId,
    code: payload.code,
    name: payload.name,
    description: payload.description || null,
    type: payload.type,
    scope: payload.scope || "cart",
    value: payload.value,
    currency: payload.currency || "INR",
    minOrderAmount: payload.minOrderAmount || null,
    maxDiscountAmount: payload.maxDiscountAmount || null,
    usageLimit: payload.usageLimit || null,
    usageCount: 0,
    perCustomerLimit: payload.perCustomerLimit || 1,
    targetVariantIds: payload.targetVariantIds || [],
    targetCategoryIds: payload.targetCategoryIds || [],
    validFrom: payload.validFrom || null,
    validTo: payload.validTo || null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    version: 1,
  });

  return { id: couponId };
}

// ecom.updateCoupon - Update coupon
export async function updateCoupon(
  payload: UpdateCouponCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = payload.organizationId || context.actor.orgId;

  const [existing] = await db
    .select()
    .from(ecomCoupons)
    .where(
      and(
        eq(ecomCoupons.id, payload.couponId),
        eq(ecomCoupons.organizationId, orgId),
        isNull(ecomCoupons.deletedAt),
      ),
    );

  if (!existing) {
    throw new Error("Coupon not found");
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.description !== undefined)
    updates.description = payload.description;
  if (payload.value !== undefined) updates.value = payload.value;
  if (payload.minOrderAmount !== undefined)
    updates.minOrderAmount = payload.minOrderAmount;
  if (payload.maxDiscountAmount !== undefined)
    updates.maxDiscountAmount = payload.maxDiscountAmount;
  if (payload.usageLimit !== undefined) updates.usageLimit = payload.usageLimit;
  if (payload.perCustomerLimit !== undefined)
    updates.perCustomerLimit = payload.perCustomerLimit;
  if (payload.targetVariantIds !== undefined)
    updates.targetVariantIds = payload.targetVariantIds;
  if (payload.targetCategoryIds !== undefined)
    updates.targetCategoryIds = payload.targetCategoryIds;
  if (payload.validFrom !== undefined) updates.validFrom = payload.validFrom;
  if (payload.validTo !== undefined) updates.validTo = payload.validTo;
  if (payload.isActive !== undefined) updates.isActive = payload.isActive;

  await db
    .update(ecomCoupons)
    .set(updates)
    .where(eq(ecomCoupons.id, payload.couponId));
  return { id: payload.couponId };
}

// ecom.deleteCoupon - Delete coupon (soft delete)
export async function deleteCoupon(
  payload: DeleteCouponCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = payload.organizationId || context.actor.orgId;

  await db
    .update(ecomCoupons)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(ecomCoupons.id, payload.couponId));
  return { id: payload.couponId };
}

// ecom.createAddress - Create shipping/billing address
export async function createAddress(
  payload: CreateAddressCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = payload.organizationId || context.actor.orgId;
  const addressId = generateId();
  const now = new Date();

  if (payload.type === "shipping" || payload.type === "billing") {
    await db
      .update(ecomAddresses)
      .set({ isDefault: false, updatedAt: now })
      .where(
        and(
          eq(ecomAddresses.actorId, payload.actorId),
          eq(ecomAddresses.organizationId, orgId),
          eq(ecomAddresses.type, payload.type),
          eq(ecomAddresses.isDefault, true),
        ),
      );
  }

  await db.insert(ecomAddresses).values({
    id: addressId,
    organizationId: orgId,
    actorId: payload.actorId,
    type: payload.type,
    firstName: payload.firstName,
    lastName: payload.lastName,
    company: payload.company || null,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2 || null,
    city: payload.city,
    state: payload.state,
    postalCode: payload.postalCode,
    country: payload.country || "IN",
    phone: payload.phone || null,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
    version: 1,
  });

  return { id: addressId };
}

// ecom.updateAddress - Update address
export async function updateAddress(
  payload: UpdateAddressCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = payload.organizationId || context.actor.orgId;

  const [existing] = await db
    .select()
    .from(ecomAddresses)
    .where(
      and(
        eq(ecomAddresses.id, payload.addressId),
        eq(ecomAddresses.organizationId, orgId),
        isNull(ecomAddresses.deletedAt),
      ),
    );

  if (!existing) {
    throw new Error("Address not found");
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (payload.firstName !== undefined) updates.firstName = payload.firstName;
  if (payload.lastName !== undefined) updates.lastName = payload.lastName;
  if (payload.company !== undefined) updates.company = payload.company;
  if (payload.addressLine1 !== undefined)
    updates.addressLine1 = payload.addressLine1;
  if (payload.addressLine2 !== undefined)
    updates.addressLine2 = payload.addressLine2;
  if (payload.city !== undefined) updates.city = payload.city;
  if (payload.state !== undefined) updates.state = payload.state;
  if (payload.postalCode !== undefined) updates.postalCode = payload.postalCode;
  if (payload.country !== undefined) updates.country = payload.country;
  if (payload.phone !== undefined) updates.phone = payload.phone;

  await db
    .update(ecomAddresses)
    .set(updates)
    .where(eq(ecomAddresses.id, payload.addressId));
  return { id: payload.addressId };
}

// ecom.deleteAddress - Delete address (soft delete)
export async function deleteAddress(
  payload: DeleteAddressCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = payload.organizationId || context.actor.orgId;

  await db
    .update(ecomAddresses)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(ecomAddresses.id, payload.addressId));
  return { id: payload.addressId };
}

// ecom.setDefaultAddress - Set default address
export async function setDefaultAddress(
  payload: SetDefaultAddressCommand,
  context: SystemContext,
): Promise<{ id: ID }> {
  const orgId = payload.organizationId || context.actor.orgId;
  const now = new Date();

  const [address] = await db
    .select()
    .from(ecomAddresses)
    .where(
      and(
        eq(ecomAddresses.id, payload.addressId),
        eq(ecomAddresses.organizationId, orgId),
        isNull(ecomAddresses.deletedAt),
      ),
    );

  if (!address) {
    throw new Error("Address not found");
  }

  await db
    .update(ecomAddresses)
    .set({ isDefault: false, updatedAt: now })
    .where(
      and(
        eq(ecomAddresses.actorId, payload.actorId),
        eq(ecomAddresses.organizationId, orgId),
        eq(ecomAddresses.type, payload.type),
        eq(ecomAddresses.isDefault, true),
      ),
    );

  await db
    .update(ecomAddresses)
    .set({ isDefault: true, updatedAt: now })
    .where(eq(ecomAddresses.id, payload.addressId));
  return { id: payload.addressId };
}
