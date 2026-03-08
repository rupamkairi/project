// Ecommerce Compose Hooks
// Event handlers that wire together the ecommerce modules

import type { DomainEvent } from "../../../core/event";
import type { HookHandler, HookContext } from "../../../core/compose/hooks";
import type { ID } from "../../../core/entity";

// ============================================================================
// Hook Handler Types
// ============================================================================

/**
 * Context for module dispatch calls
 */
interface ModuleDispatchContext {
  orgId: ID;
  actorId?: ID;
  correlationId: ID;
}

// ============================================================================
// Hook: onOrderPlaced
// ============================================================================

/**
 * Handler for order.placed event
 * - Reserve inventory
 * - Create payment session
 * - Notify customer
 */
export const onOrderPlaced: HookHandler = async (
  event: DomainEvent,
  context: HookContext,
) => {
  const payload = event.payload as {
    orderId: ID;
    orderNumber: string;
    customerId: ID;
    total: number;
    currency: string;
  };

  console.log(`[Ecommerce Hook] Order placed: ${payload.orderNumber}`);

  try {
    // 1. Reserve inventory for the order
    await context.dispatch("inventory.reserve", {
      orderId: payload.orderId,
      items: [], // Items would come from order details
      orgId: context.orgId,
    });

    // Emit inventory reserved event
    await context.emit({
      type: "inventory.reserved",
      aggregateId: payload.orderId,
      aggregateType: "ecom_orders",
      payload: {
        orderId: payload.orderId,
        reservedAt: Date.now(),
      },
      actorId: context.actorId,
      orgId: context.orgId,
      correlationId: context.correlationId,
      causedBy: context.actorId,
      version: 1,
      source: "ecommerce",
      metadata: {},
    });

    // 2. Create payment session
    await context.dispatch("ledger.createPaymentSession", {
      orderId: payload.orderId,
      amount: payload.total,
      currency: payload.currency,
      orgId: context.orgId,
    });

    // 3. Notify customer about order confirmation
    await context.dispatch("notification.send", {
      type: "order_confirmation",
      recipientId: payload.customerId,
      channel: "email",
      template: "order-placed",
      data: {
        orderNumber: payload.orderNumber,
        orderId: payload.orderId,
        total: payload.total,
        currency: payload.currency,
      },
      orgId: context.orgId,
    });

    console.log(
      `[Ecommerce Hook] Order placed processing complete: ${payload.orderNumber}`,
    );
  } catch (error) {
    console.error(`[Ecommerce Hook] Error processing order placed:`, error);
    // Could emit an error event here for further handling
  }
};

// ============================================================================
// Hook: onPaymentReceived
// ============================================================================

/**
 * Handler for payment.received event
 * - Post ledger transaction
 * - Advance FSM
 * - Start workflow
 * - Notify customer
 */
export const onPaymentReceived: HookHandler = async (
  event: DomainEvent,
  context: HookContext,
) => {
  const payload = event.payload as {
    orderId: ID;
    orderNumber: string;
    amount: number;
    currency: string;
    gatewayRef?: string;
  };

  console.log(`[Ecommerce Hook] Payment received: ${payload.orderNumber}`);

  try {
    // 1. Post ledger transaction for the payment
    await context.dispatch("ledger.postTransaction", {
      type: "payment_received",
      orderId: payload.orderId,
      amount: payload.amount,
      currency: payload.currency,
      gatewayRef: payload.gatewayRef,
      accounts: {
        debit: "payment_receivable",
        credit: "revenue",
      },
      orgId: context.orgId,
    });

    // Emit payment recorded event
    await context.emit({
      type: "ledger.transaction.posted",
      aggregateId: payload.orderId,
      aggregateType: "ecom_orders",
      payload: {
        orderId: payload.orderId,
        transactionType: "payment_received",
        amount: payload.amount,
      },
      actorId: context.actorId,
      orgId: context.orgId,
      correlationId: context.correlationId,
      causedBy: context.actorId,
      version: 1,
      source: "ecommerce",
      metadata: {},
    });

    // 2. Advance the order FSM
    await context.dispatch("fsm.transition", {
      entityType: "order",
      entityId: payload.orderId,
      event: "PAYMENT_CONFIRMED",
      orgId: context.orgId,
    });

    // 3. Start the order fulfillment workflow
    await context.dispatch("workflow.start", {
      templateId: "order-fulfillment",
      entityId: payload.orderId,
      entityType: "order",
      input: {
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
      },
      orgId: context.orgId,
    });

    // 4. Notify customer about payment confirmation
    await context.dispatch("notification.send", {
      type: "payment_confirmation",
      recipientId: event.actorId,
      channel: "email",
      template: "payment-received",
      data: {
        orderNumber: payload.orderNumber,
        orderId: payload.orderId,
        amount: payload.amount,
        currency: payload.currency,
      },
      orgId: context.orgId,
    });

    console.log(
      `[Ecommerce Hook] Payment received processing complete: ${payload.orderNumber}`,
    );
  } catch (error) {
    console.error(`[Ecommerce Hook] Error processing payment received:`, error);
  }
};

// ============================================================================
// Hook: onPaymentFailed
// ============================================================================

/**
 * Handler for payment.failed event
 * - Release inventory
 * - Advance FSM
 * - Notify customer
 */
export const onPaymentFailed: HookHandler = async (
  event: DomainEvent,
  context: HookContext,
) => {
  const payload = event.payload as {
    orderId: ID;
    orderNumber: string;
    reason: string;
  };

  console.log(`[Ecommerce Hook] Payment failed: ${payload.orderNumber}`);

  try {
    // 1. Release inventory reservation
    await context.dispatch("inventory.release", {
      orderId: payload.orderId,
      orgId: context.orgId,
    });

    // Emit inventory released event
    await context.emit({
      type: "inventory.released",
      aggregateId: payload.orderId,
      aggregateType: "ecom_orders",
      payload: {
        orderId: payload.orderId,
        reason: "payment_failed",
        releasedAt: Date.now(),
      },
      actorId: context.actorId,
      orgId: context.orgId,
      correlationId: context.correlationId,
      causedBy: context.actorId,
      version: 1,
      source: "ecommerce",
      metadata: {},
    });

    // 2. Advance the order FSM to failed state
    await context.dispatch("fsm.transition", {
      entityType: "order",
      entityId: payload.orderId,
      event: "PAYMENT_FAILED",
      orgId: context.orgId,
    });

    // 3. Notify customer about payment failure
    await context.dispatch("notification.send", {
      type: "payment_failure",
      recipientId: event.actorId,
      channel: "email",
      template: "payment-failed",
      data: {
        orderNumber: payload.orderNumber,
        orderId: payload.orderId,
        reason: payload.reason,
      },
      orgId: context.orgId,
    });

    console.log(
      `[Ecommerce Hook] Payment failed processing complete: ${payload.orderNumber}`,
    );
  } catch (error) {
    console.error(`[Ecommerce Hook] Error processing payment failed:`, error);
  }
};

// ============================================================================
// Hook: onOrderShipped
// ============================================================================

/**
 * Handler for shipment.dispatched event
 * - Update geo (delivery tracking)
 * - Advance FSM
 * - Notify customer with tracking info
 */
export const onOrderShipped: HookHandler = async (
  event: DomainEvent,
  context: HookContext,
) => {
  const payload = event.payload as {
    orderId: ID;
    orderNumber: string;
    trackingNumber?: string;
    carrier?: string;
  };

  console.log(`[Ecommerce Hook] Order shipped: ${payload.orderNumber}`);

  try {
    // 1. Update geo with delivery tracking info
    if (payload.trackingNumber) {
      await context.dispatch("geo.updateDeliveryStatus", {
        orderId: payload.orderId,
        status: "in_transit",
        trackingNumber: payload.trackingNumber,
        carrier: payload.carrier,
        orgId: context.orgId,
      });
    }

    // Emit shipment tracking updated event
    await context.emit({
      type: "shipment.tracking.updated",
      aggregateId: payload.orderId,
      aggregateType: "ecom_orders",
      payload: {
        orderId: payload.orderId,
        trackingNumber: payload.trackingNumber,
        carrier: payload.carrier,
        status: "in_transit",
      },
      actorId: context.actorId,
      orgId: context.orgId,
      correlationId: context.correlationId,
      causedBy: context.actorId,
      version: 1,
      source: "ecommerce",
      metadata: {},
    });

    // 2. Advance the order FSM
    await context.dispatch("fsm.transition", {
      entityType: "order",
      entityId: payload.orderId,
      event: "SHIPPED",
      orgId: context.orgId,
    });

    // 3. Notify customer with tracking information
    await context.dispatch("notification.send", {
      type: "shipment_dispatched",
      recipientId: event.actorId,
      channel: "email",
      template: "order-shipped",
      data: {
        orderNumber: payload.orderNumber,
        orderId: payload.orderId,
        trackingNumber: payload.trackingNumber,
        carrier: payload.carrier,
      },
      orgId: context.orgId,
    });

    console.log(
      `[Ecommerce Hook] Order shipped processing complete: ${payload.orderNumber}`,
    );
  } catch (error) {
    console.error(`[Ecommerce Hook] Error processing order shipped:`, error);
  }
};

// ============================================================================
// Hook: onOrderDelivered
// ============================================================================

/**
 * Handler for shipment.delivered event
 * - Advance FSM
 * - Schedule review request
 */
export const onOrderDelivered: HookHandler = async (
  event: DomainEvent,
  context: HookContext,
) => {
  const payload = event.payload as {
    orderId: ID;
    orderNumber: string;
  };

  console.log(`[Ecommerce Hook] Order delivered: ${payload.orderNumber}`);

  try {
    // 1. Advance the order FSM
    await context.dispatch("fsm.transition", {
      entityType: "order",
      entityId: payload.orderId,
      event: "DELIVERED",
      orgId: context.orgId,
    });

    // Emit order delivered event
    await context.emit({
      type: "order.delivered",
      aggregateId: payload.orderId,
      aggregateType: "ecom_orders",
      payload: {
        orderId: payload.orderId,
        deliveredAt: Date.now(),
      },
      actorId: context.actorId,
      orgId: context.orgId,
      correlationId: context.correlationId,
      causedBy: context.actorId,
      version: 1,
      source: "ecommerce",
      metadata: {},
    });

    // 2. Schedule a review request (delayed notification)
    await context.dispatch("notification.schedule", {
      type: "review_request",
      recipientId: event.actorId,
      channel: "email",
      template: "review-request",
      delay: 86400000 * 3, // 3 days after delivery
      data: {
        orderNumber: payload.orderNumber,
        orderId: payload.orderId,
      },
      orgId: context.orgId,
    });

    // 3. Notify customer about delivery
    await context.dispatch("notification.send", {
      type: "order_delivered",
      recipientId: event.actorId,
      channel: "email",
      template: "order-delivered",
      data: {
        orderNumber: payload.orderNumber,
        orderId: payload.orderId,
      },
      orgId: context.orgId,
    });

    console.log(
      `[Ecommerce Hook] Order delivered processing complete: ${payload.orderNumber}`,
    );
  } catch (error) {
    console.error(`[Ecommerce Hook] Error processing order delivered:`, error);
  }
};

// ============================================================================
// Hook: onRefundRequested
// ============================================================================

/**
 * Handler for return.requested event
 * - Validate return window
 * - Issue refund
 * - Restock inventory
 * - Notify customer
 */
export const onRefundRequested: HookHandler = async (
  event: DomainEvent,
  context: HookContext,
) => {
  const payload = event.payload as {
    orderId: ID;
    orderNumber: string;
    refundAmount: number;
    currency: string;
    reason: string;
  };

  console.log(`[Ecommerce Hook] Refund requested: ${payload.orderNumber}`);

  try {
    // 1. Validate return window (7 days from delivery)
    // This would typically query the order to check delivery date
    const returnWindowValid = true; // Would be calculated from order delivery date
    const returnWindowDays = 7;

    if (!returnWindowValid) {
      // Emit return rejected event
      await context.emit({
        type: "return.rejected",
        aggregateId: payload.orderId,
        aggregateType: "ecom_orders",
        payload: {
          orderId: payload.orderId,
          reason: "return_window_expired",
        },
        actorId: context.actorId,
        orgId: context.orgId,
        correlationId: context.correlationId,
        causedBy: context.actorId,
        version: 1,
        source: "ecommerce",
        metadata: {},
      });

      // Notify customer about rejection
      await context.dispatch("notification.send", {
        type: "return_rejected",
        recipientId: event.actorId,
        channel: "email",
        template: "return-rejected",
        data: {
          orderNumber: payload.orderNumber,
          orderId: payload.orderId,
          reason: `Return window of ${returnWindowDays} days has expired`,
        },
        orgId: context.orgId,
      });

      return;
    }

    // 2. Issue refund through ledger
    await context.dispatch("ledger.issueRefund", {
      orderId: payload.orderId,
      amount: payload.refundAmount,
      currency: payload.currency,
      reason: payload.reason,
      orgId: context.orgId,
    });

    // Emit refund issued event
    await context.emit({
      type: "refund.issued",
      aggregateId: payload.orderId,
      aggregateType: "ecom_orders",
      payload: {
        orderId: payload.orderId,
        refundAmount: payload.refundAmount,
        currency: payload.currency,
        issuedAt: Date.now(),
      },
      actorId: context.actorId,
      orgId: context.orgId,
      correlationId: context.correlationId,
      causedBy: context.actorId,
      version: 1,
      source: "ecommerce",
      metadata: {},
    });

    // 3. Restock inventory (items returned)
    await context.dispatch("inventory.restock", {
      orderId: payload.orderId,
      items: [], // Items would come from order
      orgId: context.orgId,
    });

    // Emit inventory restocked event
    await context.emit({
      type: "inventory.restocked",
      aggregateId: payload.orderId,
      aggregateType: "ecom_orders",
      payload: {
        orderId: payload.orderId,
        restockedAt: Date.now(),
      },
      actorId: context.actorId,
      orgId: context.orgId,
      correlationId: context.correlationId,
      causedBy: context.actorId,
      version: 1,
      source: "ecommerce",
      metadata: {},
    });

    // 4. Advance the order FSM
    await context.dispatch("fsm.transition", {
      entityType: "order",
      entityId: payload.orderId,
      event: "REFUNDED",
      orgId: context.orgId,
    });

    // 5. Notify customer about refund
    await context.dispatch("notification.send", {
      type: "refund_issued",
      recipientId: event.actorId,
      channel: "email",
      template: "refund-issued",
      data: {
        orderNumber: payload.orderNumber,
        orderId: payload.orderId,
        refundAmount: payload.refundAmount,
        currency: payload.currency,
      },
      orgId: context.orgId,
    });

    console.log(
      `[Ecommerce Hook] Refund requested processing complete: ${payload.orderNumber}`,
    );
  } catch (error) {
    console.error(`[Ecommerce Hook] Error processing refund requested:`, error);
  }
};

// ============================================================================
// Hook Registry - Export all hooks for registration
// ============================================================================

/**
 * All hook handlers for the ecommerce compose
 */
export const EcommerceComposeHooks = {
  onOrderPlaced,
  onPaymentReceived,
  onPaymentFailed,
  onOrderShipped,
  onOrderDelivered,
  onRefundRequested,
};

/**
 * Get a hook handler by name
 */
export function getHookHandler(
  name: keyof typeof EcommerceComposeHooks,
): HookHandler {
  return EcommerceComposeHooks[name];
}

/**
 * Register all hooks with a hook registry
 */
export function registerEcommerceHooks(registry: {
  register: (options: {
    id: string;
    composeId: string;
    eventPattern: string;
    handler: HookHandler;
  }) => void;
}): void {
  const hooks = [
    {
      id: "ecommerce.onOrderPlaced",
      eventPattern: "ecom.order.placed",
      handler: onOrderPlaced,
    },
    {
      id: "ecommerce.onPaymentReceived",
      eventPattern: "ecom.payment.received",
      handler: onPaymentReceived,
    },
    {
      id: "ecommerce.onPaymentFailed",
      eventPattern: "ecom.payment.failed",
      handler: onPaymentFailed,
    },
    {
      id: "ecommerce.onOrderShipped",
      eventPattern: "ecom.order.shipped",
      handler: onOrderShipped,
    },
    {
      id: "ecommerce.onOrderDelivered",
      eventPattern: "ecom.order.delivered",
      handler: onOrderDelivered,
    },
    {
      id: "ecommerce.onRefundRequested",
      eventPattern: "ecom.return.requested",
      handler: onRefundRequested,
    },
  ];

  for (const hook of hooks) {
    registry.register({
      id: hook.id,
      composeId: "ecommerce",
      eventPattern: hook.eventPattern,
      handler: hook.handler,
    });
  }
}

export default EcommerceComposeHooks;
