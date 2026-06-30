import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent, NotFoundError } from "@core";
import { db } from "../lib/db.js";
import { rstCategories } from "../db/schema/restaurant.js";
import { eq, and } from "drizzle-orm";

export function createMenuRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/menu" })
    .get("/categories", async ({ request }) => {
      const session = (request as any).session;
      const outletId = new URL(request.url).searchParams.get("outletId");
      const cats = await db.query.rstCategories.findMany({
        where: and(
          eq(rstCategories.organizationId, session.orgId),
          eq(rstCategories.isActive, true),
        ),
        orderBy: (t, { asc }) => [asc(t.sortOrder)],
      });
      return { data: cats };
    })

    .post("/categories", async ({ body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const [cat] = await db.insert(rstCategories).values({
        organizationId: session.orgId,
        name: input.name,
        sortOrder: input.sortOrder ?? 0,
        parentId: input.parentId,
        mealPeriod: input.mealPeriod ?? "all",
      }).returning();
      return { data: cat };
    })

    .get("/items", async ({ request }) => {
      const session = (request as any).session;
      const url = new URL(request.url);
      const outletId = url.searchParams.get("outletId");
      const items = await mediator.query({
        type: "catalog.listItems",
        params: { orgId: session.orgId, type: "menu_item", outletId },
        actorId: session.actorId,
        orgId: session.orgId,
      });
      return { data: items };
    })

    .post("/items", async ({ body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const item = await mediator.dispatch({
        type: "catalog.createItem",
        payload: {
          type: "menu_item",
          name: input.name,
          description: input.description,
          meta: {
            basePrice: input.basePrice,
            categoryId: input.categoryId,
            station: input.station,
            isAvailable: true,
            isPopular: false,
            outletId: input.outletId,
          },
        },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      return { data: item };
    })

    .patch("/items/:id", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const item = await mediator.dispatch({
        type: "catalog.updateItem",
        payload: { itemId: params.id, ...input },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      return { data: item };
    })

    .post("/items/:id/toggle-86", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const item = await mediator.dispatch({
        type: "catalog.updateItem",
        payload: { itemId: params.id, meta: { isAvailable: input.available } },
        actorId: session.actorId,
        orgId: session.orgId,
        correlationId: generateId(),
      });
      await bus.publish(createDomainEvent(
        "rst.menu.item-86d", params.id, "rst.menu-item",
        { menuItemId: params.id, available: input.available, orgId: session.orgId },
        session.orgId,
      ));
      return { data: item };
    });
}
