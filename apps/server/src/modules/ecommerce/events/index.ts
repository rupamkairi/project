// Ecommerce Events
// Domain events for ecommerce operations

import type { ID, Timestamp } from "../../../core/entity";

// ============================================
// Event Payloads
// ============================================

// Order Events
export interface OrderPlacedPayload {
  orderId: ID;
  orderNumber: string;
  customerId: ID;
  total: number;
  currency: string;
}

export interface OrderConfirmedPayload {
  orderId: ID;
  orderNumber: string;
  paymentRef?: string;
}

export interface OrderProcessingPayload {
  orderId: ID;
  orderNumber: string;
}

export interface OrderShippedPayload {
  orderId: ID;
  orderNumber: string;
  trackingNumber?: string;
  carrier?: string;
}

export interface OrderDeliveredPayload {
  orderId: ID;
  orderNumber: string;
}

export interface OrderCancelledPayload {
  orderId: ID;
  orderNumber: string;
  reason: string;
}

export interface OrderRefundedPayload {
  orderId: ID;
  orderNumber: string;
  refundAmount: number;
  currency: string;
}

// Payment Events
export interface PaymentReceivedPayload {
  orderId: ID;
  orderNumber: string;
  amount: number;
  currency: string;
  gatewayRef?: string;
}

export interface PaymentFailedPayload {
  orderId: ID;
  orderNumber: string;
  reason: string;
}

// Cart Events
export interface CartCreatedPayload {
  cartId: ID;
  customerId?: ID;
  sessionId?: string;
}

export interface CartUpdatedPayload {
  cartId: ID;
  customerId?: ID;
}

export interface CartConvertedPayload {
  cartId: ID;
  orderId: ID;
  orderNumber: string;
}

// ============================================
// Event Type Constants
// ============================================

// Order events
export const ORDER_PLACED = "ecom.order.placed";
export const ORDER_CONFIRMED = "ecom.order.confirmed";
export const ORDER_PROCESSING = "ecom.order.processing";
export const ORDER_SHIPPED = "ecom.order.shipped";
export const ORDER_DELIVERED = "ecom.order.delivered";
export const ORDER_CANCELLED = "ecom.order.cancelled";
export const ORDER_REFUNDED = "ecom.order.refunded";

// Payment events
export const PAYMENT_RECEIVED = "ecom.payment.received";
export const PAYMENT_FAILED = "ecom.payment.failed";

// Cart events
export const CART_CREATED = "ecom.cart.created";
export const CART_UPDATED = "ecom.cart.updated";
export const CART_CONVERTED = "ecom.cart.converted";

// ============================================
// Base Event Structure Factory
// ============================================

function createBaseEvent(
  type: string,
  aggregateId: ID,
  aggregateType: string,
  payload: unknown,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return {
    id: "" as ID,
    type,
    aggregateId,
    aggregateType,
    payload,
    occurredAt: Date.now() as Timestamp,
    actorId,
    orgId,
    correlationId: correlationId || ("" as ID),
    causedBy: actorId,
    version: 1,
    source: "ecommerce",
    metadata: {},
  };
}

// ============================================
// Event Factory Functions
// ============================================

export function createOrderPlacedEvent(
  aggregateId: ID,
  payload: OrderPlacedPayload,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return createBaseEvent(
    ORDER_PLACED,
    aggregateId,
    "ecom_orders",
    payload,
    orgId,
    actorId,
    correlationId,
  );
}

export function createOrderConfirmedEvent(
  aggregateId: ID,
  payload: OrderConfirmedPayload,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return createBaseEvent(
    ORDER_CONFIRMED,
    aggregateId,
    "ecom_orders",
    payload,
    orgId,
    actorId,
    correlationId,
  );
}

export function createOrderProcessingEvent(
  aggregateId: ID,
  payload: OrderProcessingPayload,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return createBaseEvent(
    ORDER_PROCESSING,
    aggregateId,
    "ecom_orders",
    payload,
    orgId,
    actorId,
    correlationId,
  );
}

export function createOrderShippedEvent(
  aggregateId: ID,
  payload: OrderShippedPayload,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return createBaseEvent(
    ORDER_SHIPPED,
    aggregateId,
    "ecom_orders",
    payload,
    orgId,
    actorId,
    correlationId,
  );
}

export function createOrderDeliveredEvent(
  aggregateId: ID,
  payload: OrderDeliveredPayload,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return createBaseEvent(
    ORDER_DELIVERED,
    aggregateId,
    "ecom_orders",
    payload,
    orgId,
    actorId,
    correlationId,
  );
}

export function createOrderCancelledEvent(
  aggregateId: ID,
  payload: OrderCancelledPayload,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return createBaseEvent(
    ORDER_CANCELLED,
    aggregateId,
    "ecom_orders",
    payload,
    orgId,
    actorId,
    correlationId,
  );
}

export function createOrderRefundedEvent(
  aggregateId: ID,
  payload: OrderRefundedPayload,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return createBaseEvent(
    ORDER_REFUNDED,
    aggregateId,
    "ecom_orders",
    payload,
    orgId,
    actorId,
    correlationId,
  );
}

export function createPaymentReceivedEvent(
  aggregateId: ID,
  payload: PaymentReceivedPayload,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return createBaseEvent(
    PAYMENT_RECEIVED,
    aggregateId,
    "ecom_orders",
    payload,
    orgId,
    actorId,
    correlationId,
  );
}

export function createPaymentFailedEvent(
  aggregateId: ID,
  payload: PaymentFailedPayload,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return createBaseEvent(
    PAYMENT_FAILED,
    aggregateId,
    "ecom_orders",
    payload,
    orgId,
    actorId,
    correlationId,
  );
}

export function createCartCreatedEvent(
  aggregateId: ID,
  payload: CartCreatedPayload,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return createBaseEvent(
    CART_CREATED,
    aggregateId,
    "ecom_carts",
    payload,
    orgId,
    actorId,
    correlationId,
  );
}

export function createCartUpdatedEvent(
  aggregateId: ID,
  payload: CartUpdatedPayload,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return createBaseEvent(
    CART_UPDATED,
    aggregateId,
    "ecom_carts",
    payload,
    orgId,
    actorId,
    correlationId,
  );
}

export function createCartConvertedEvent(
  aggregateId: ID,
  payload: CartConvertedPayload,
  orgId: ID,
  actorId?: ID,
  correlationId?: ID,
) {
  return createBaseEvent(
    CART_CONVERTED,
    aggregateId,
    "ecom_carts",
    payload,
    orgId,
    actorId,
    correlationId,
  );
}

// ============================================
// Event Type Aliases for manifest
// ============================================

export type EcommerceEvent =
  | ReturnType<typeof createOrderPlacedEvent>
  | ReturnType<typeof createOrderConfirmedEvent>
  | ReturnType<typeof createOrderProcessingEvent>
  | ReturnType<typeof createOrderShippedEvent>
  | ReturnType<typeof createOrderDeliveredEvent>
  | ReturnType<typeof createOrderCancelledEvent>
  | ReturnType<typeof createOrderRefundedEvent>
  | ReturnType<typeof createPaymentReceivedEvent>
  | ReturnType<typeof createPaymentFailedEvent>
  | ReturnType<typeof createCartCreatedEvent>
  | ReturnType<typeof createCartUpdatedEvent>
  | ReturnType<typeof createCartConvertedEvent>;
