// Order Fulfillment Workflow Template
// Defines the stages and tasks for fulfilling an order from confirmation to delivery

import type { ID } from "../../../core/entity";
import type { RuleExpr, Action } from "../../../core/state";

// ============================================
// Workflow Template Types
// ============================================

export type WorkflowStageId =
  | "pending"
  | "pick-pack"
  | "ship"
  | "in-transit"
  | "out-for-delivery"
  | "delivered";

export type TaskId =
  // Pick & Pack stage tasks
  | "verify-items"
  | "pack-items"
  | "print-label"
  | "update-inventory"
  // Ship stage tasks
  | "create-shipment"
  | "generate-tracking"
  | "dispatch-package"
  // In Transit stage tasks
  | "track-shipment"
  | "update-customer"
  // Out for Delivery stage tasks
  | "final-mile-update"
  // Delivered stage tasks
  | "confirm-delivery"
  | "notify-customer"
  | "trigger-review-request";

export interface WorkflowTask {
  id: TaskId;
  title: string;
  description: string;
  assigneeRole: "warehouse-staff" | "store-staff" | "store-admin" | "system";
  parallel?: boolean;
}

export interface WorkflowStage {
  id: WorkflowStageId;
  label: string;
  description: string;
  entryGuard?: RuleExpr;
  entryActions?: Action[];
  exitActions?: Action[];
  tasks: WorkflowTask[];
  // Conditional task that runs based on a rule
  conditionalTasks?: {
    guard: RuleExpr;
    tasks: WorkflowTask[];
  };
}

// ============================================
// Event Constants
// ============================================

// Workflow stage entry events
export const WORKFLOW_STAGE_PENDING_ENTERED = "workflow.stage:pending-entered";
export const WORKFLOW_STAGE_PICK_PACK_ENTERED =
  "workflow.stage:pick-pack-entered";
export const WORKFLOW_STAGE_SHIP_ENTERED = "workflow.stage:ship-entered";
export const WORKFLOW_STAGE_IN_TRANSIT_ENTERED =
  "workflow.stage:in-transit-entered";
export const WORKFLOW_STAGE_OUT_FOR_DELIVERY_ENTERED =
  "workflow.stage:out-for-delivery-entered";
export const WORKFLOW_STAGE_DELIVERED_ENTERED =
  "workflow.stage:delivered-entered";

// Shipment events (emitted on task completion)
export const SHIPMENT_DISPATCHED = "shipment.dispatched";
export const SHIPMENT_DELIVERED = "shipment.delivered";
export const SHIPMENT_IN_TRANSIT = "shipment.in-transit";
export const SHIPMENT_OUT_FOR_DELIVERY = "shipment.out-for-delivery";

// ============================================
// High Value Order Rule
// ============================================

// Guard: Order total >= ₹10,000 requires approval
const HIGH_VALUE_ORDER_GUARD: RuleExpr = {
  field: "order.total",
  op: "gte",
  value: 10000,
};

// ============================================
// Workflow Template Definition
// ============================================

/**
 * ORDER_FULFILLMENT Workflow Template
 *
 * Defines the stages for fulfilling an order from pending to delivered.
 * This template is used to create workflow instances for orders.
 */
export const ORDER_FULFILLMENT_TEMPLATE = {
  id: "ORDER_FULFILLMENT" as const,
  name: "Order Fulfillment",
  description:
    "Workflow template for order fulfillment from confirmation to delivery",
  entityType: "ecom_orders" as const,

  // Stage definitions in order
  stages: [
    // Stage 1: Pending - Initial state, waiting for payment confirmation
    {
      id: "pending" as WorkflowStageId,
      label: "Pending",
      description: "Initial state, waiting for payment confirmation",
      entryActions: [],
      exitActions: [],
      tasks: [],
    },

    // Stage 2: Pick & Pack - Warehouse team selects items and packs them
    {
      id: "pick-pack" as WorkflowStageId,
      label: "Pick & Pack",
      description:
        "Warehouse team selects items from shelf and packs them for shipping",
      // Entry Guard: Order status must be 'confirmed'
      entryGuard: {
        field: "order.status",
        op: "eq",
        value: "confirmed",
      },
      // Emit event to trigger order.processing in FSM
      entryActions: [
        {
          type: "emit",
          event: WORKFLOW_STAGE_PICK_PACK_ENTERED,
        },
      ],
      tasks: [
        {
          id: "verify-items" as TaskId,
          title: "Verify Items",
          description: "Verify items are available in inventory",
          assigneeRole: "warehouse-staff",
        },
        {
          id: "pack-items" as TaskId,
          title: "Pack Items",
          description: "Pack items into shipping container",
          assigneeRole: "warehouse-staff",
        },
        {
          id: "print-label" as TaskId,
          title: "Print Shipping Label",
          description: "Print and attach shipping label",
          assigneeRole: "warehouse-staff",
        },
        {
          id: "update-inventory" as TaskId,
          title: "Update Inventory",
          description: "Decrement inventory for picked items",
          assigneeRole: "system",
        },
      ],
      // Conditional: HIGH_VALUE_ORDER_REVIEW - If order > ₹10,000, requires store-admin approval
      conditionalTasks: {
        guard: HIGH_VALUE_ORDER_GUARD,
        tasks: [
          {
            id: "high-value-approval" as TaskId,
            title: "High Value Order Review",
            description:
              "Requires store-admin approval for orders above ₹10,000",
            assigneeRole: "store-admin",
          },
        ],
      },
    },

    // Stage 3: Ship - Handed to carrier for shipping
    {
      id: "ship" as WorkflowStageId,
      label: "Ship",
      description: "Hand over package to carrier for shipping",
      entryActions: [],
      // Emit shipment.dispatched on stage completion
      exitActions: [
        {
          type: "emit",
          event: SHIPMENT_DISPATCHED,
        },
      ],
      tasks: [
        {
          id: "create-shipment" as TaskId,
          title: "Create Shipment",
          description: "Create shipment record with carrier",
          assigneeRole: "warehouse-staff",
        },
        {
          id: "generate-tracking" as TaskId,
          title: "Generate Tracking",
          description: "Generate tracking number from carrier",
          assigneeRole: "system",
        },
        {
          id: "dispatch-package" as TaskId,
          title: "Dispatch Package",
          description: "Hand over package to carrier",
          assigneeRole: "warehouse-staff",
        },
      ],
    },

    // Stage 4: In Transit - Package in transit with tracking
    {
      id: "in-transit" as WorkflowStageId,
      label: "In Transit",
      description: "Package is in transit with tracking updates",
      entryActions: [],
      exitActions: [],
      tasks: [
        {
          id: "track-shipment" as TaskId,
          title: "Track Shipment",
          description: "Monitor shipment status via carrier API",
          assigneeRole: "system",
          parallel: true,
        },
        {
          id: "update-customer" as TaskId,
          title: "Update Customer",
          description: "Send tracking updates to customer",
          assigneeRole: "system",
          parallel: true,
        },
      ],
    },

    // Stage 5: Out for Delivery - Final delivery leg
    {
      id: "out-for-delivery" as WorkflowStageId,
      label: "Out for Delivery",
      description: "Package is out for final delivery to customer",
      entryActions: [],
      exitActions: [],
      tasks: [
        {
          id: "final-mile-update" as TaskId,
          title: "Final Mile Update",
          description: "Track final delivery leg and update customer",
          assigneeRole: "system",
        },
      ],
    },

    // Stage 6: Delivered - Successfully delivered to customer
    {
      id: "delivered" as WorkflowStageId,
      label: "Delivered",
      description: "Package successfully delivered to customer",
      // Emit shipment.delivered event
      entryActions: [
        {
          type: "emit",
          event: SHIPMENT_DELIVERED,
        },
      ],
      exitActions: [],
      tasks: [
        {
          id: "confirm-delivery" as TaskId,
          title: "Confirm Delivery",
          description: "Confirm delivery with carrier",
          assigneeRole: "system",
        },
        {
          id: "notify-customer" as TaskId,
          title: "Notify Customer",
          description: "Send delivery confirmation to customer",
          assigneeRole: "system",
        },
        {
          id: "trigger-review-request" as TaskId,
          title: "Trigger Review Request",
          description: "Request customer review for the order",
          assigneeRole: "system",
        },
      ],
    },
  ] as WorkflowStage[],
} as const;

// ============================================
// Type Exports
// ============================================

export type OrderFulfillmentTemplate = typeof ORDER_FULFILLMENT_TEMPLATE;

// ============================================
// Helper Functions
// ============================================

/**
 * Get a stage by ID from the template
 */
export function getStageById(
  stageId: WorkflowStageId,
): WorkflowStage | undefined {
  return ORDER_FULFILLMENT_TEMPLATE.stages.find(
    (stage) => stage.id === stageId,
  );
}

/**
 * Get all tasks for a given stage
 */
export function getStageTasks(stageId: WorkflowStageId): WorkflowTask[] {
  const stage = getStageById(stageId);
  if (!stage) return [];

  const tasks = [...stage.tasks];

  // Include conditional tasks if their guard passes
  if (stage.conditionalTasks) {
    // Note: The actual guard evaluation would happen at runtime with context
    // This is just returning all conditional tasks for reference
    tasks.push(...stage.conditionalTasks.tasks);
  }

  return tasks;
}

/**
 * Get stage index for sequential progression
 */
export function getStageIndex(stageId: WorkflowStageId): number {
  return ORDER_FULFILLMENT_TEMPLATE.stages.findIndex(
    (stage) => stage.id === stageId,
  );
}

/**
 * Get the next stage after a given stage
 */
export function getNextStage(
  stageId: WorkflowStageId,
): WorkflowStage | undefined {
  const currentIndex = getStageIndex(stageId);
  if (
    currentIndex === -1 ||
    currentIndex >= ORDER_FULFILLMENT_TEMPLATE.stages.length - 1
  ) {
    return undefined;
  }
  return ORDER_FULFILLMENT_TEMPLATE.stages[currentIndex + 1];
}

/**
 * Check if a stage is the final stage
 */
export function isFinalStage(stageId: WorkflowStageId): boolean {
  const lastStage =
    ORDER_FULFILLMENT_TEMPLATE.stages[
      ORDER_FULFILLMENT_TEMPLATE.stages.length - 1
    ];
  return lastStage?.id === stageId;
}

/**
 * Get entry action for a stage
 */
export function getStageEntryActions(stageId: WorkflowStageId): Action[] {
  const stage = getStageById(stageId);
  return stage?.entryActions ?? [];
}

/**
 * Get exit action for a stage
 */
export function getStageExitActions(stageId: WorkflowStageId): Action[] {
  const stage = getStageById(stageId);
  return stage?.exitActions ?? [];
}

/**
 * Get the event that should be emitted when entering a stage
 */
export function getStageEntryEvent(
  stageId: WorkflowStageId,
): string | undefined {
  const entryActions = getStageEntryActions(stageId);
  const emitAction = entryActions.find((action) => action.type === "emit");
  return emitAction?.event;
}

/**
 * Get all stages as a readonly array
 */
export function getAllStages(): readonly WorkflowStage[] {
  return ORDER_FULFILLMENT_TEMPLATE.stages;
}
