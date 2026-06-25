import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent, NotFoundError, ConflictError } from "@core";

export function inventoryRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/inventory" })
    .get("/ingredients", async ({ request }) => {
      const session = (request as any).session;
      const items = await mediator.query({
        type: "catalog.listItems",
        params: { orgId: session.orgId, type: "stock_item" },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      return {
        data: (items as any[]).map((i) => ({
          id: i.id,
          name: i.name,
          stock: i.meta?.currentStock ?? 0,
          unit: i.meta?.unit ?? "pcs",
          reorderLevel: i.meta?.reorderLevel ?? 0,
        })),
      };
    })

    .post("/ingredients/:id/adjust", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const item = await mediator.query({
        type: "catalog.getItem",
        params: { itemId: params.id },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      if (!item) throw new NotFoundError("Ingredient not found");
      const currentStock = item.meta?.currentStock ?? 0;
      const newStock = currentStock + input.delta;
      if (newStock < 0) throw new ConflictError(`Adjustment would result in negative stock: ${newStock}`);
      await mediator.dispatch({
        type: "catalog.updateItem",
        payload: { itemId: params.id, meta: { ...item.meta, currentStock: newStock } },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      return { data: { itemId: params.id, newStock, delta: input.delta } };
    });
}
