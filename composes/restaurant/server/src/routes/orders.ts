import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent } from "@core";
import { ConflictError, NotFoundError, ValidationError } from "@core";
import { db } from "@db/client";
import { eq, and } from "drizzle-orm";
import { rstKot, rstKotItems } from "../db/schema/restaurant";
import { groupBy, nextLocationSeq, formatOrderNumber, formatKotNumber } from "../lib/utils";

async function getOrderStage(mediator: Mediator, orgId: string, stageName: string) {
  const stages = await mediator.query<any>({
    type: "pipeline.listStages",
    params: { organizationId: orgId, entityType: "rst.order" },
    actorId: "system",
    orgId,
  });
  return (stages?.items ?? stages ?? []).find((s: any) => s.name === stageName);
}

async function createKots(
  mediator: Mediator,
  transactionId: string,
  outletId: string,
  outletCode: string,
  orgId: string,
  items: any[],
) {
  const byStation = groupBy(items, (i: any) => i.station ?? "default");

  for (const [station, stationItems] of Object.entries(byStation)) {
    const seq = await nextLocationSeq(outletId, "lastKotSeq");
    const kotNumber = formatKotNumber(outletCode, seq);

    const kot = await db
      .insert(rstKot)
      .values({
        id: generateId(),
        organizationId: orgId,
        transactionId,
        locationId: outletId,
        kotNumber,
        station,
        status: "sent",
        sentAt: new Date(),
      })
      .returning();

    await db.insert(rstKotItems).values(
      stationItems.map((item: any) => ({
        id: generateId(),
        organizationId: orgId,
        kotId: kot[0].id,
        transactionLineId: item.lineId ?? generateId(),
        itemId: item.menuItemId,
        name: item.name,
        qty: item.qty,
        modifiers: item.modifiers ?? [],
        notes: item.note ?? null,
        status: "pending",
      })),
    );
  }
}

export function orderRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/orders" })
    .get("/", async (ctx) => {
      const q = (ctx as any).query ?? {};
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const orders = await mediator.query<any>({
        type: "commerce.listTransactions",
        params: {
          type: "order",
          organizationId: orgId,
          limit: parseInt(q.limit ?? "50"),
          offset: parseInt(q.page ?? "1") > 1 ? (parseInt(q.page) - 1) * 50 : 0,
        },
        actorId: actor?.id ?? "system",
        orgId,
      });

      return { data: orders?.items ?? orders ?? [] };
    })

    .get("/:id", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const order = await mediator.query<any>({
        type: "commerce.getTransaction",
        params: { transactionId: params.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      if (!order) throw new NotFoundError("Order not found");

      const kots = await db.query.rstKot.findMany({
        where: and(eq(rstKot.transactionId, params.id), eq(rstKot.organizationId, orgId)),
      });

      return { ...order, kots };
    })

    .post("/", async (ctx) => {
      const body = (ctx as any).body as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const outlet = await mediator.query<any>({
        type: "location.getLocation",
        params: { locationId: body.outletId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      if (!outlet) throw new NotFoundError("Outlet not found");

      if (body.type === "dine-in" && body.tableId) {
        await mediator.dispatch<any>({
          type: "location.updateStatus",
          payload: { locationId: body.tableId, status: "occupied" },
          actorId: actor?.id ?? "system",
          orgId,
          correlationId: generateId(),
        });
      }

      const draftStage = await getOrderStage(mediator, orgId, "Placed");
      const seq = await nextLocationSeq(body.outletId, "lastOrderSeq");
      const orderNumber = formatOrderNumber(outlet.code ?? "ORD", seq);

      const order = await mediator.dispatch<any>({
        type: "commerce.createTransaction",
        payload: {
          type: "order",
          organizationId: orgId,
          personId: body.customerId ?? null,
          stageId: draftStage?.id ?? null,
          meta: {
            outletId: body.outletId,
            orderNumber,
            orderType: body.type,
            source: body.source ?? "pos",
            tableId: body.tableId ?? null,
            coverCount: body.coverCount ?? null,
            waiterId: actor?.id ?? null,
            deliveryAddress: body.deliveryAddress ?? null,
            couponCode: body.couponCode ?? null,
            specialInstructions: body.specialInstructions ?? null,
            status: "draft",
          },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await bus.publish(createDomainEvent(
        "rst.orders.live-update",
        order?.id,
        "rst.order",
        { orderId: order?.id, event: "created", orgId },
        orgId,
      ));
      return { data: order };
    })

    // Place order
    .post("/:id/place", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;
      const items: any[] = (body as any).items ?? [];

      if (items.length === 0) {
        throw new ValidationError("At least one item required");
      }

      const order = await mediator.query<any>({
        type: "commerce.getTransaction",
        params: { transactionId: params.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      if (!order) throw new NotFoundError("Order not found");

      const outletId = order.meta?.outletId;
      const outlet = await mediator.query<any>({
        type: "location.getLocation",
        params: { locationId: outletId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      const resolvedItems: any[] = [];
      for (const item of items) {
        const menuItem = await mediator.query<any>({
          type: "catalog.getItem",
          params: { itemId: item.menuItemId, organizationId: orgId },
          actorId: actor?.id ?? "system",
          orgId,
        });

        if (!menuItem || menuItem.type !== "menu_item") {
          throw new NotFoundError(`Item ${item.menuItemId} not found`);
        }

        if (!menuItem.meta?.isAvailable) {
          throw new ConflictError(`${menuItem.name} is unavailable`);
        }

        const line = await mediator.dispatch<any>({
          type: "commerce.addLine",
          payload: {
            transactionId: params.id,
            itemId: item.menuItemId,
            qty: item.qty,
            unitPrice: menuItem.meta?.basePrice ?? 0,
            organizationId: orgId,
            meta: {
              name: menuItem.name,
              modifiers: item.modifiers ?? [],
              note: item.note ?? null,
              station: menuItem.meta?.station ?? "default",
            },
          },
          actorId: actor?.id ?? "system",
          orgId,
          correlationId: generateId(),
        });

        resolvedItems.push({
          ...item,
          lineId: line?.id,
          name: menuItem.name,
          station: menuItem.meta?.station ?? "default",
          unitPrice: menuItem.meta?.basePrice ?? 0,
        });
      }

      await createKots(
        mediator,
        params.id,
        outletId,
        outlet?.code ?? "ORD",
        orgId,
        resolvedItems,
      );

      await mediator.dispatch<any>({
        type: "commerce.updateTransactionMeta",
        payload: { transactionId: params.id, organizationId: orgId, meta: { status: "placed" } },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await bus.publish(createDomainEvent(
        "rst.order.placed",
        params.id,
        "rst.order",
        { orderId: params.id, orgId, outletId },
        orgId,
      ));
      await bus.publish(createDomainEvent(
        "rst.orders.live-update",
        params.id,
        "rst.order",
        { orderId: params.id, event: "placed", orgId },
        orgId,
      ));

      return { status: "placed", orderId: params.id };
    })

    // Accept order
    .post("/:id/accept", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const preparingStage = await getOrderStage(mediator, orgId, "Preparing");

      await mediator.dispatch<any>({
        type: "commerce.advanceStage",
        payload: { transactionId: params.id, stageId: preparingStage?.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await mediator.dispatch<any>({
        type: "commerce.updateTransactionMeta",
        payload: {
          transactionId: params.id,
          organizationId: orgId,
          meta: { status: "accepted", acceptedAt: new Date().toISOString() },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await bus.publish(createDomainEvent(
        "rst.orders.live-update",
        params.id,
        "rst.order",
        { orderId: params.id, event: "accepted", orgId },
        orgId,
      ));
      return { status: "accepted" };
    })

    // Reject order
    .post("/:id/reject", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const cancelledStage = await getOrderStage(mediator, orgId, "Cancelled");

      await mediator.dispatch<any>({
        type: "commerce.advanceStage",
        payload: { transactionId: params.id, stageId: cancelledStage?.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await mediator.dispatch<any>({
        type: "commerce.updateTransactionMeta",
        payload: {
          transactionId: params.id,
          organizationId: orgId,
          meta: { status: "rejected", rejectionReason: (body as any)?.reason ?? null },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await bus.publish(createDomainEvent(
        "rst.order.rejected",
        params.id,
        "rst.order",
        { orderId: params.id, orgId },
        orgId,
      ));
      await bus.publish(createDomainEvent(
        "rst.orders.live-update",
        params.id,
        "rst.order",
        { orderId: params.id, event: "rejected", orgId },
        orgId,
      ));
      return { status: "rejected" };
    })

    // Add items to existing order
    .post("/:id/items", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;
      const items: any[] = (body as any).items ?? [];

      const order = await mediator.query<any>({
        type: "commerce.getTransaction",
        params: { transactionId: params.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      if (!order) throw new NotFoundError("Order not found");

      const outletId = order.meta?.outletId;
      const outlet = await mediator.query<any>({
        type: "location.getLocation",
        params: { locationId: outletId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      const resolvedItems: any[] = [];
      for (const item of items) {
        const menuItem = await mediator.query<any>({
          type: "catalog.getItem",
          params: { itemId: item.menuItemId, organizationId: orgId },
          actorId: actor?.id ?? "system",
          orgId,
        });

        if (!menuItem?.meta?.isAvailable) {
          throw new ConflictError(`${menuItem?.name} is unavailable`);
        }

        const line = await mediator.dispatch<any>({
          type: "commerce.addLine",
          payload: {
            transactionId: params.id,
            itemId: item.menuItemId,
            qty: item.qty,
            unitPrice: menuItem.meta?.basePrice ?? 0,
            organizationId: orgId,
            meta: { modifiers: item.modifiers ?? [], note: item.note ?? null },
          },
          actorId: actor?.id ?? "system",
          orgId,
          correlationId: generateId(),
        });

        resolvedItems.push({
          ...item,
          lineId: line?.id,
          name: menuItem.name,
          station: menuItem.meta?.station ?? "default",
        });
      }

      await createKots(
        mediator,
        params.id,
        outletId,
        outlet?.code ?? "ORD",
        orgId,
        resolvedItems,
      );

      return { status: "items_added", count: items.length };
    })

    // Remove item
    .delete("/:id/items/:itemId", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      await mediator.dispatch<any>({
        type: "commerce.removeLine",
        payload: { transactionId: params.id, lineId: params.itemId, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { status: "item_removed" };
    });
}
