import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent } from "@core";
import { db } from "@db/client";
import { eq, isNull } from "drizzle-orm";
import { rstDeliveries } from "../db/schema/restaurant";

type Scheduler = {
  register: (job: { name: string; cron: string; fn: () => Promise<void> }) => void;
};

async function findNearestRider(mediator: Mediator, orgId: string): Promise<any | null> {
  const riders = await mediator.query<any>({
    type: "identity.listPersons",
    params: { organizationId: orgId, type: "rider", limit: 100 },
    actorId: "system",
    orgId,
  }).catch(() => ({ items: [] }));

  const available = (riders?.items ?? riders ?? []).filter(
    (r: any) => r.meta?.status === "available",
  );

  return available[0] ?? null;
}

export function registerRestaurantJobs(
  scheduler: Scheduler,
  mediator: Mediator,
  bus: EventBus,
): void {
  // Auto-assign riders to unassigned deliveries every 2 min
  scheduler.register({
    name: "rst.delivery-assignment-check",
    cron: "*/2 * * * *",
    fn: async () => {
      const unassigned = await db.query.rstDeliveries.findMany({
        where: isNull(rstDeliveries.personId),
      });

      for (const delivery of unassigned) {
        if (delivery.status !== "pending-assignment") continue;

        const orgId = delivery.organizationId;
        const rider = await findNearestRider(mediator, orgId);

        if (rider) {
          await db
            .update(rstDeliveries)
            .set({ personId: rider.id, status: "assigned", updatedAt: new Date() })
            .where(eq(rstDeliveries.id, delivery.id));

          await mediator.dispatch<any>({
            type: "identity.updatePersonMeta",
            payload: {
              personId: rider.id,
              meta: { status: "busy", activeDeliveryId: delivery.id },
              organizationId: orgId,
            },
            actorId: "system",
            orgId,
            correlationId: generateId(),
          }).catch(() => null);

          await bus.publish(createDomainEvent(
            "rst.delivery.assigned",
            delivery.id,
            "rst.delivery",
            { deliveryId: delivery.id, riderId: rider.id, orgId },
            orgId,
          ));
        } else {
          await bus.publish(createDomainEvent(
            "rst.delivery.no-rider",
            delivery.id,
            "rst.delivery",
            { deliveryId: delivery.id, orgId },
            orgId,
          ));
        }
      }
    },
  });

  // Auto-open/close outlets by operating hours every 10 min
  scheduler.register({
    name: "rst.operating-hours-check",
    cron: "*/10 * * * *",
    fn: async () => {
      const outlets = await mediator.query<any>({
        type: "location.listLocations",
        params: { type: "outlet", limit: 500 },
        actorId: "system",
        orgId: "system",
      }).catch(() => ({ items: [] }));

      const now = new Date();
      const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      for (const outlet of (outlets?.items ?? outlets ?? [])) {
        const hours = outlet.meta?.operatingHours?.[dayOfWeek];
        if (!hours) continue;

        const orgId = outlet.organizationId;

        if (currentTime < hours.open && outlet.status === "active") {
          await mediator.dispatch<any>({
            type: "location.updateStatus",
            payload: { locationId: outlet.id, status: "inactive" },
            actorId: "system",
            orgId,
            correlationId: generateId(),
          }).catch(() => null);
        } else if (currentTime >= hours.open && currentTime <= hours.close && outlet.status === "inactive") {
          await mediator.dispatch<any>({
            type: "location.updateStatus",
            payload: { locationId: outlet.id, status: "active" },
            actorId: "system",
            orgId,
            correlationId: generateId(),
          }).catch(() => null);
        }
      }
    },
  });

  // Reorder alerts daily at 8AM
  scheduler.register({
    name: "rst.reorder-alerts",
    cron: "0 8 * * *",
    fn: async () => {
      const items = await mediator.query<any>({
        type: "catalog.listItems",
        params: { type: "stock_item", limit: 1000 },
        actorId: "system",
        orgId: "system",
      }).catch(() => ({ items: [] }));

      const lowStock = (items?.items ?? items ?? []).filter(
        (i: any) =>
          parseFloat(i.meta?.currentStock ?? "999") <= parseFloat(i.meta?.reorderLevel ?? "0"),
      );

      if (lowStock.length > 0) {
        await bus.publish(createDomainEvent(
          "rst.inventory.low-stock-alert",
          "system",
          "rst.inventory",
          { items: lowStock },
          "system",
        ));
      }
    },
  });

  // Nightly analytics aggregation at 2AM
  scheduler.register({
    name: "rst.analytics-aggregate",
    cron: "0 2 * * *",
    fn: async () => {
      await bus.publish(createDomainEvent(
        "rst.analytics.daily-aggregate",
        "system",
        "rst.analytics",
        { timestamp: new Date().toISOString() },
        "system",
      ));
    },
  });
}
