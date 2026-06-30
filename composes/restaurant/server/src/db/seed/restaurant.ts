import type { Mediator } from "@core";
import { generateId } from "@core";

export async function seedRestaurant(mediator: Mediator, orgId: string) {
  // Seed rst.order pipeline stages
  try {
    await mediator.dispatch({
      type: "pipeline.seed",
      payload: {
        entityType: "rst.order",
        stages: ["Placed", "Accepted", "Preparing", "Ready", "Served", "Cancelled", "Rejected"],
      },
      actorId: "system",
      orgId,
      correlationId: generateId(),
    });
  } catch {
    // pipeline may already exist
  }

  try {
    await mediator.dispatch({
      type: "pipeline.seed",
      payload: {
        entityType: "rst.delivery",
        stages: ["Assigned", "Picked Up", "On the Way", "Delivered", "Failed"],
      },
      actorId: "system",
      orgId,
      correlationId: generateId(),
    });
  } catch {
    // pipeline may already exist
  }
}
