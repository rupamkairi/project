// Ecommerce FSM
// Order Finite State Machine

import type {
  StateMachine,
  StateNode,
  Transition,
  TimedTransition,
  Action,
} from "../../../core/state";

// ============================================
// Order Status Types
// ============================================

export type OrderStatus =
  | "pending_payment"
  | "payment_failed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

// Order Events (triggers for FSM transitions)
export type OrderEvent =
  | "payment.received"
  | "payment.failed"
  | "workflow.stage:pick-pack-entered"
  | "shipment.dispatched"
  | "shipment.delivered"
  | "refund.issued"
  | "cancel.requested";

// ============================================
// FSM Definition
// ============================================

// States: pending_payment → payment_failed | confirmed → processing → shipped → delivered

const states: Record<OrderStatus, StateNode<OrderStatus, OrderEvent>> = {
  // Initial state - order created, awaiting payment
  pending_payment: {
    label: "Awaiting Payment",
    terminal: false,
    on: {
      // Transition to confirmed on payment received
      "payment.received": {
        target: "confirmed",
        guard: undefined,
        actions: [
          {
            type: "emit",
            event: "ecom.order.confirmed",
          },
        ],
      },
      // Transition to payment_failed on payment failure
      "payment.failed": {
        target: "payment_failed",
        actions: [
          {
            type: "emit",
            event: "ecom.payment.failed",
          },
        ],
      },
      // Guard: can cancel within 30 minutes
      "cancel.requested": {
        target: "cancelled",
        guard: {
          // Guard expression: check if within 30 min of order creation
          ref: "order.age",
          op: "lt",
          value: 30 * 60 * 1000, // 30 minutes in ms
        },
        actions: [
          {
            type: "emit",
            event: "ecom.order.cancelled",
          },
        ],
      },
    },
    // Auto-transition after 30 minutes if still pending
    after: [
      {
        after: 30 * 60 * 1000, // 30 minutes
        target: "cancelled",
        guard: undefined,
        actions: [
          {
            type: "emit",
            event: "ecom.order.cancelled",
          },
        ],
      },
    ],
  },

  // Payment failed state
  payment_failed: {
    label: "Payment Failed",
    terminal: true,
  },

  // Order confirmed - payment received, ready for processing
  confirmed: {
    label: "Order Confirmed",
    terminal: false,
    on: {
      // Transition to processing when workflow enters pick-pack stage
      "workflow.stage:pick-pack-entered": {
        target: "processing",
        actions: [
          {
            type: "emit",
            event: "ecom.order.processing",
          },
        ],
      },
      // Allow cancellation in confirmed state
      "cancel.requested": {
        target: "cancelled",
        actions: [
          {
            type: "emit",
            event: "ecom.order.cancelled",
          },
        ],
      },
    },
  },

  // Processing - order is being picked and packed
  processing: {
    label: "Processing",
    terminal: false,
    on: {
      // Transition to shipped when shipment is dispatched
      "shipment.dispatched": {
        target: "shipped",
        actions: [
          {
            type: "emit",
            event: "ecom.order.shipped",
          },
        ],
      },
    },
  },

  // Shipped - order is on its way
  shipped: {
    label: "Shipped",
    terminal: false,
    on: {
      // Transition to delivered when shipment is delivered
      "shipment.delivered": {
        target: "delivered",
        actions: [
          {
            type: "emit",
            event: "ecom.order.delivered",
          },
        ],
      },
    },
  },

  // Delivered - order has been delivered
  delivered: {
    label: "Delivered",
    terminal: false,
    on: {
      // Can issue refund within return window
      "refund.issued": {
        target: "refunded",
        guard: {
          // Guard: within return window (e.g., 30 days)
          ref: "order.delivery.age",
          op: "lt",
          value: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
        },
        actions: [
          {
            type: "emit",
            event: "ecom.order.refunded",
          },
        ],
      },
    },
  },

  // Cancelled - order was cancelled
  cancelled: {
    label: "Cancelled",
    terminal: true,
  },

  // Refunded - order was refunded
  refunded: {
    label: "Refunded",
    terminal: true,
  },
};

// Order FSM definition
export const orderFSM: StateMachine<OrderStatus, OrderEvent> = {
  id: "ecom-order",
  entityType: "ecom_orders",
  initial: "pending_payment",
  states,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a transition is valid for a given state
 */
export function canTransition(
  currentState: OrderStatus,
  event: OrderEvent,
): boolean {
  const stateNode = states[currentState];
  if (!stateNode || !stateNode.on) {
    return false;
  }
  return event in stateNode.on;
}

/**
 * Get the next state for a given current state and event
 */
export function getNextState(
  currentState: OrderStatus,
  event: OrderEvent,
): OrderStatus | null {
  const stateNode = states[currentState];
  if (!stateNode || !stateNode.on) {
    return null;
  }

  const transition = stateNode.on[event];
  if (!transition) {
    return null;
  }

  // Handle array of transitions - take first one
  if (Array.isArray(transition)) {
    return transition[0]?.target ?? null;
  }

  return transition.target;
}

/**
 * Get all valid events for a given state
 */
export function getValidEvents(currentState: OrderStatus): OrderEvent[] {
  const stateNode = states[currentState];
  if (!stateNode || !stateNode.on) {
    return [];
  }

  return Object.keys(stateNode.on) as OrderEvent[];
}

/**
 * Check if a state is terminal
 */
export function isTerminalState(state: OrderStatus): boolean {
  const stateNode = states[state];
  return stateNode?.terminal ?? false;
}

/**
 * Get state label
 */
export function getStateLabel(state: OrderStatus): string {
  return states[state]?.label ?? state;
}
