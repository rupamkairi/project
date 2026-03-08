// Ecommerce Workflows
// Export all workflow templates for the ecommerce compose

import {
  ORDER_FULFILLMENT_TEMPLATE,
  type OrderFulfillmentTemplate,
  type WorkflowStageId,
  type TaskId,
  type WorkflowTask,
  type WorkflowStage,
  // Event constants
  WORKFLOW_STAGE_PENDING_ENTERED,
  WORKFLOW_STAGE_PICK_PACK_ENTERED,
  WORKFLOW_STAGE_SHIP_ENTERED,
  WORKFLOW_STAGE_IN_TRANSIT_ENTERED,
  WORKFLOW_STAGE_OUT_FOR_DELIVERY_ENTERED,
  WORKFLOW_STAGE_DELIVERED_ENTERED,
  SHIPMENT_DISPATCHED,
  SHIPMENT_DELIVERED,
  SHIPMENT_IN_TRANSIT,
  SHIPMENT_OUT_FOR_DELIVERY,
  // Helper functions
  getStageById,
  getStageTasks,
  getStageIndex,
  getNextStage,
  isFinalStage,
  getStageEntryActions,
  getStageExitActions,
  getStageEntryEvent,
  getAllStages,
} from "./order-fulfillment";

// Re-export everything
export {
  ORDER_FULFILLMENT_TEMPLATE,
  type OrderFulfillmentTemplate,
  type WorkflowStageId,
  type TaskId,
  type WorkflowTask,
  type WorkflowStage,
  WORKFLOW_STAGE_PENDING_ENTERED,
  WORKFLOW_STAGE_PICK_PACK_ENTERED,
  WORKFLOW_STAGE_SHIP_ENTERED,
  WORKFLOW_STAGE_IN_TRANSIT_ENTERED,
  WORKFLOW_STAGE_OUT_FOR_DELIVERY_ENTERED,
  WORKFLOW_STAGE_DELIVERED_ENTERED,
  SHIPMENT_DISPATCHED,
  SHIPMENT_DELIVERED,
  SHIPMENT_IN_TRANSIT,
  SHIPMENT_OUT_FOR_DELIVERY,
  getStageById,
  getStageTasks,
  getStageIndex,
  getNextStage,
  isFinalStage,
  getStageEntryActions,
  getStageExitActions,
  getStageEntryEvent,
  getAllStages,
};

// ============================================
// Workflow Templates Registry
// ============================================

/**
 * Registry of all workflow templates for the ecommerce compose
 * This can be used to register templates with the workflow module
 */
export const ECOMMERCE_WORKFLOW_TEMPLATES = [
  ORDER_FULFILLMENT_TEMPLATE,
] as const;

/**
 * Get a template by ID
 */
export function getWorkflowTemplateById(id: string) {
  return ECOMMERCE_WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get all template IDs
 */
export function getAllTemplateIds() {
  return ECOMMERCE_WORKFLOW_TEMPLATES.map((t) => t.id);
}
