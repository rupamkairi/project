import type { Mediator, EventBus, Scheduler } from "@core";
import { generateId, createDomainEvent } from "@core";
import { db } from "../lib/db.js";
import { rstDeliveries } from "../db/schema/restaurant.js";
import { and, eq } from "drizzle-orm";

export function registerRestaurantJobs(scheduler: Scheduler, mediator: Mediator, bus: EventBus): void {
  // Every 2min: auto-assign unassigned deliveries
  scheduler.register("rst.delivery.auto-assign", "*/2 * * * *", async () => {
    const unassigned = await db.query.rstDeliveries.findMany({
      where: eq(rstDeliveries.status, "unassigned"),
    });
    for (const delivery of unassigned) {
      try {
        const order = await mediator.query({
          type: "commerce.getTransaction",
          params: { transactionId: delivery.transactionId },
          actorId: "system",
          orgId: delivery.organizationId,
        });
        const riders = await mediator.query({
          type: "identity.listPersons",
          params: { orgId: delivery.organizationId, type: "rider" },
          actorId: "system",
          orgId: delivery.organizationId,
        }).catch(() => []);
        const available = (riders as any[]).find((r) => r.meta?.status === "available");
        if (!available) continue;
        await db.update(rstDeliveries)
          .set({ personId: available.id, status: "assigned" })
          .where(eq(rstDeliveries.id, delivery.id));
        await bus.publish(createDomainEvent(
          "rst.delivery.assigned", delivery.id, "rst.delivery",
          { deliveryId: delivery.id, riderId: available.id, orgId: delivery.organizationId },
          delivery.organizationId,
        ));
      } catch {
        // skip failed
      }
    }
  });
}
