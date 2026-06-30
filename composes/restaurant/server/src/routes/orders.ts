import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent, NotFoundError, ValidationError, ConflictError } from "@core";
import { db } from "../lib/db.js";
import { rstKot, rstKotItems } from "../db/schema/restaurant.js";
import { eq } from "drizzle-orm";

function orderNumber(outletCode: string): string {
  return `ORD-${outletCode}-${Date.now().toString(36).toUpperCase()}`;
}

function kotNumber(outletCode: string, station: string): string {
  return `KOT-${outletCode}-${station.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
}

export function orderRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/orders" })
    .get("/", async ({ request }) => {
      const session = (request as any).session;
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get("limit") ?? "50");
      const status = url.searchParams.get("status");
      const outletId = url.searchParams.get("outletId");
      const orders = await mediator.query({
        type: "commerce.listTransactions",
        params: { orgId: session.orgId, type: "order", status, limit, outletId },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      return { data: orders };
    })

    .get("/:id", async ({ params, request }) => {
      const session = (request as any).session;
      const order = await mediator.query({
        type: "commerce.getTransaction",
        params: { transactionId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      if (!order) throw new NotFoundError("Order not found");
      const kots = await db.query.rstKot.findMany({
        where: eq(rstKot.transactionId, params.id),
        with: { items: true },
      });
      return { data: { ...order, kots } };
    })

    .post("/", async ({ body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const outlet = await mediator.query({
        type: "location.get",
        params: { locationId: input.outletId },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      if (!outlet) throw new NotFoundError("Outlet not found");

      if (input.tableId) {
        const table = await mediator.query({
          type: "location.get",
          params: { locationId: input.tableId },
          actorId: session.actorId,
          orgId: session.orgId,
        });
        if (!table) throw new NotFoundError("Table not found");
        if (table.status === "occupied") throw new ConflictError("Table already occupied");
        await mediator.dispatch({
          type: "location.updateStatus",
          payload: { locationId: input.tableId, status: "occupied" },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        });
      }

      const order = await mediator.dispatch({
        type: "commerce.createTransaction",
        payload: {
          type: "order",
          meta: {
            orderType: input.type ?? "dine-in",
            tableId: input.tableId,
            outletId: input.outletId,
            orderNumber: orderNumber(outlet.code ?? "OUT"),
            status: "draft",
            source: "pos",
          },
        },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      return { data: order };
    })

    .post("/:id/place", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      if (!input.items?.length) throw new ValidationError("At least one item required");

      const order = await mediator.query({
        type: "commerce.getTransaction",
        params: { transactionId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      if (!order) throw new NotFoundError("Order not found");
      if (order.meta?.status !== "draft") throw new ConflictError("Order already placed");

      for (const item of input.items) {
        const menuItem = await mediator.query({
          type: "catalog.getItem",
          params: { itemId: item.menuItemId },
          actorId: session.actorId,
          orgId: session.orgId,
        });
        if (!menuItem) throw new NotFoundError(`Menu item not found: ${item.menuItemId}`);
        if (menuItem.meta?.isAvailable === false) throw new ConflictError(`${menuItem.name} is unavailable`);

        await mediator.dispatch({
          type: "commerce.addLine",
          payload: {
            transactionId: params.id,
            itemId: item.menuItemId,
            qty: item.qty,
            unitPrice: menuItem.meta?.basePrice ?? 0,
            meta: {
              name: menuItem.name,
              station: menuItem.meta?.station,
              modifiers: item.modifiers ?? [],
              note: item.note,
            },
          },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        });
      }

      await mediator.dispatch({
        type: "commerce.updateTransaction",
        payload: {
          transactionId: params.id,
          meta: { ...order.meta, status: "placed" },
        },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });

      // Create KOTs grouped by station
      const stationMap = new Map<string, typeof input.items>();
      for (const item of input.items) {
        const menuItem = await mediator.query({
          type: "catalog.getItem",
          params: { itemId: item.menuItemId },
          actorId: session.actorId,
          orgId: session.orgId,
        });
        const station = menuItem?.meta?.station ?? "general";
        if (!stationMap.has(station)) stationMap.set(station, []);
        stationMap.get(station)!.push({ ...item, name: menuItem?.name ?? item.menuItemId });
      }

      for (const [station, items] of stationMap) {
        const kotId = generateId();
        await db.insert(rstKot).values({
          id: kotId,
          organizationId: session.orgId,
          transactionId: params.id,
          kotNumber: kotNumber(order.meta?.outletId?.slice(0, 3) ?? "OUT", station),
          station,
          status: "new",
        });
        for (const item of items) {
          await db.insert(rstKotItems).values({
            organizationId: session.orgId,
            kotId,
            transactionLineId: generateId(),
            itemId: item.menuItemId,
            name: item.name,
            qty: item.qty,
            notes: item.note,
            modifiers: item.modifiers ?? [],
          });
        }
        await bus.publish(createDomainEvent(
          "rst.kds.new-kot", kotId, "rst.kot",
          { kotId, station, orderId: params.id, orgId: session.orgId, outletId: order.meta?.outletId },
          session.orgId,
        ));
      }

      await bus.publish(createDomainEvent(
        "rst.order.placed", params.id, "rst.order",
        { orderId: params.id, orgId: session.orgId, outletId: order.meta?.outletId },
        session.orgId,
      ));

      return { data: { orderId: params.id, status: "placed" } };
    })

    .post("/:id/accept", async ({ params, request }) => {
      const session = (request as any).session;
      const order = await mediator.query({
        type: "commerce.getTransaction",
        params: { transactionId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      if (!order) throw new NotFoundError("Order not found");
      await mediator.dispatch({
        type: "commerce.updateTransaction",
        payload: { transactionId: params.id, meta: { ...order.meta, status: "accepted" } },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      return { data: { orderId: params.id, status: "accepted" } };
    })

    .post("/:id/reject", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const order = await mediator.query({
        type: "commerce.getTransaction",
        params: { transactionId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      if (!order) throw new NotFoundError("Order not found");
      await mediator.dispatch({
        type: "commerce.updateTransaction",
        payload: { transactionId: params.id, meta: { ...order.meta, status: "rejected", rejectReason: input?.reason } },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      return { data: { orderId: params.id, status: "rejected" } };
    });
}
