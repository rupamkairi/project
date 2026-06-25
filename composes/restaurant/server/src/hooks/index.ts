import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent } from "@core";
import { db } from "../lib/db.js";
import { rstKot, rstDeliveries } from "../db/schema/restaurant.js";
import { eq } from "drizzle-orm";

export function registerRestaurantHooks(bus: EventBus, mediator: Mediator): void {
  // All KOTs ready → advance order to ready
  bus.subscribe("rst.kot.ready", async (event) => {
    const { kotId, orderId, orgId } = event.payload as any;
    const kots = await db.query.rstKot.findMany({ where: eq(rstKot.transactionId, orderId) });
    const allReady = kots.every((k) => k.status === "ready");
    if (!allReady) return;

    const order = await mediator.query({
      type: "commerce.getTransaction",
      params: { transactionId: orderId },
      actorId: "system",
      orgId,
    }).catch(() => null);
    if (!order) return;

    await mediator.dispatch({
      type: "commerce.updateTransaction",
      payload: { transactionId: orderId, meta: { ...order.meta, status: "ready" } },
      actorId: "system",
      orgId,
      correlationId: generateId(),
    });

    await bus.publish(createDomainEvent("rst.order.ready", orderId, "rst.order", { orderId, orgId }, orgId));

    if (order.meta?.orderType === "delivery") {
      const [delivery] = await db.insert(rstDeliveries).values({
        organizationId: orgId,
        transactionId: orderId,
        trackingCode: `TRK-${Date.now().toString(36).toUpperCase()}`,
        deliveryAddress: order.meta?.deliveryAddress,
        status: "unassigned",
      }).returning();
      await bus.publish(createDomainEvent("rst.delivery.created", delivery.id, "rst.delivery", { deliveryId: delivery.id, orgId }, orgId));
    }
  });

  // Order settled → update table status + analytics
  bus.subscribe("rst.order.settled", async (event) => {
    const { billId, orderId, orgId } = event.payload as any;
    if (!orderId) return;
    const order = await mediator.query({
      type: "commerce.getTransaction",
      params: { transactionId: orderId },
      actorId: "system",
      orgId,
    }).catch(() => null);
    if (!order) return;

    await mediator.dispatch({
      type: "commerce.updateTransaction",
      payload: { transactionId: orderId, meta: { ...order.meta, status: "completed" } },
      actorId: "system",
      orgId,
      correlationId: generateId(),
    }).catch(() => {});

    if (order.meta?.tableId && order.meta?.orderType === "dine-in") {
      await mediator.dispatch({
        type: "location.updateStatus",
        payload: { locationId: order.meta.tableId, status: "active" },
        actorId: "system",
        orgId,
        correlationId: generateId(),
      }).catch(() => {});
    }
  });

  // Menu item 86'd → broadcast to POS
  bus.subscribe("rst.menu.item-86d", async (event) => {
    const { menuItemId, outletId, available, orgId } = event.payload as any;
    await bus.publish(createDomainEvent("rst.pos.broadcast", menuItemId, "rst.menu-item", {
      outletId, event: "menu-update", data: { menuItemId, isAvailable: available }, orgId,
    }, orgId));
  });
}
