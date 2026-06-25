import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent } from "@core";
import { db } from "@db/client";
import { eq, and } from "drizzle-orm";
import { rstKot, rstDeliveries } from "../db/schema/restaurant";

export function registerRestaurantHooks(bus: EventBus, mediator: Mediator): void {
  // Order placed → broadcast KOTs to KDS
  bus.subscribe("rst.order.placed", async (event) => {
    const { orderId, outletId, orgId } = event.payload as any;

    const kots = await db.query.rstKot.findMany({
      where: and(eq(rstKot.transactionId, orderId), eq(rstKot.organizationId, orgId)),
    });

    for (const kot of kots) {
      await bus.publish(createDomainEvent(
        "rst.kds.new-kot",
        kot.id,
        "rst.kot",
        { kotId: kot.id, outletId: kot.locationId ?? outletId, station: kot.station, orderId, orgId },
        orgId,
      ));
    }

    await bus.publish(createDomainEvent(
      "rst.orders.live-update",
      orderId,
      "rst.order",
      { orderId, event: "placed", orgId },
      orgId,
    ));
  });

  // KOT ready → check if all KOTs for order are ready
  bus.subscribe("rst.kot.ready", async (event) => {
    const { orderId, orgId } = event.payload as any;

    const kots = await db.query.rstKot.findMany({
      where: and(eq(rstKot.transactionId, orderId), eq(rstKot.organizationId, orgId)),
    });

    const activeKots = kots.filter((k) => k.status !== "cancelled");
    const allReady = activeKots.length > 0 && activeKots.every((k) => k.status === "ready");

    if (allReady) {
      const stages = await mediator.query<any>({
        type: "pipeline.listStages",
        params: { organizationId: orgId, entityType: "rst.order" },
        actorId: "system",
        orgId,
      }).catch(() => null);

      const readyStage = (stages?.items ?? stages ?? []).find((s: any) => s.name === "Ready");

      if (readyStage) {
        await mediator.dispatch<any>({
          type: "commerce.advanceStage",
          payload: { transactionId: orderId, stageId: readyStage.id, organizationId: orgId },
          actorId: "system",
          orgId,
          correlationId: generateId(),
        });
      }

      await mediator.dispatch<any>({
        type: "commerce.updateTransactionMeta",
        payload: { transactionId: orderId, organizationId: orgId, meta: { status: "ready" } },
        actorId: "system",
        orgId,
        correlationId: generateId(),
      });

      await bus.publish(createDomainEvent("rst.order.ready", orderId, "rst.order", { orderId, orgId }, orgId));

      const order = await mediator.query<any>({
        type: "commerce.getTransaction",
        params: { transactionId: orderId, organizationId: orgId },
        actorId: "system",
        orgId,
      }).catch(() => null);

      if (order?.meta?.orderType === "delivery") {
        const existing = await db.query.rstDeliveries.findFirst({
          where: and(
            eq(rstDeliveries.transactionId, orderId),
            eq(rstDeliveries.organizationId, orgId),
          ),
        });

        if (!existing) {
          const deliveryId = generateId();
          await db.insert(rstDeliveries).values({
            id: deliveryId,
            organizationId: orgId,
            transactionId: orderId,
            status: "pending-assignment",
            deliveryAddress: JSON.stringify(order.meta?.deliveryAddress ?? {}),
          });

          await bus.publish(createDomainEvent(
            "rst.delivery.created",
            deliveryId,
            "rst.delivery",
            { deliveryId, orderId, orgId },
            orgId,
          ));
        }
      }
    }
  });

  // Order completed → reset table
  bus.subscribe("rst.order.completed", async (event) => {
    const { orderId, orgId } = event.payload as any;

    const order = await mediator.query<any>({
      type: "commerce.getTransaction",
      params: { transactionId: orderId, organizationId: orgId },
      actorId: "system",
      orgId,
    }).catch(() => null);

    if (!order) return;

    const tableId = order.meta?.tableId;
    if (tableId && order.meta?.orderType === "dine-in") {
      await mediator.dispatch<any>({
        type: "location.updateStatus",
        payload: { locationId: tableId, status: "active" },
        actorId: "system",
        orgId,
        correlationId: generateId(),
      }).catch(() => null);
    }
  });

  // Menu item 86'd → broadcast to all POS sessions
  bus.subscribe("rst.menu.item-86d", async (event) => {
    const { menuItemId, outletId, available, orgId } = event.payload as any;
    await bus.publish(createDomainEvent(
      "rst.pos.broadcast",
      outletId,
      "rst.outlet",
      { outletId, event: "menu-update", data: { menuItemId, isAvailable: available }, orgId },
      orgId,
    ));
  });

  // Delivery delivered → free rider, complete order
  bus.subscribe("rst.delivery.delivered", async (event) => {
    const { deliveryId, riderId, orderId, orgId } = event.payload as any;

    if (riderId) {
      await mediator.dispatch<any>({
        type: "identity.updatePersonMeta",
        payload: { personId: riderId, meta: { status: "available", activeDeliveryId: null }, organizationId: orgId },
        actorId: "system",
        orgId,
        correlationId: generateId(),
      }).catch(() => null);
    }

    if (deliveryId) {
      await db
        .update(rstDeliveries)
        .set({ deliveredAt: new Date(), status: "delivered", updatedAt: new Date() })
        .where(eq(rstDeliveries.id, deliveryId))
        .catch(() => null);
    }

    if (orderId) {
      await bus.publish(createDomainEvent(
        "rst.order.completed",
        orderId,
        "rst.order",
        { orderId, orgId },
        orgId,
      ));
    }
  });

  // Delivery failed → free rider
  bus.subscribe("rst.delivery.failed", async (event) => {
    const { riderId, orgId } = event.payload as any;

    if (riderId) {
      await mediator.dispatch<any>({
        type: "identity.updatePersonMeta",
        payload: { personId: riderId, meta: { status: "available", activeDeliveryId: null }, organizationId: orgId },
        actorId: "system",
        orgId,
        correlationId: generateId(),
      }).catch(() => null);
    }
  });
}
