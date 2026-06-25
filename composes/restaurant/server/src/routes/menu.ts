import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent } from "@core";
import { NotFoundError } from "@core";
import { db } from "@db/client";
import { eq, and } from "drizzle-orm";
import {
  rstCategories,
  rstModifiers,
  rstModifierGroups,
} from "../db/schema/restaurant";

export function menuRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/menu" })
    .get("/:id", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const item = await mediator.query<any>({
        type: "catalog.getItem",
        params: { itemId: params.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      if (!item) throw new NotFoundError("Menu item not found");
      return item;
    })

    .post("/", async (ctx) => {
      const body = (ctx as any).body as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const item = await mediator.dispatch<any>({
        type: "catalog.createItem",
        payload: {
          type: "menu_item",
          organizationId: orgId,
          name: body.name,
          description: body.description,
          sku: body.sku ?? `MENU-${generateId().slice(0, 8).toUpperCase()}`,
          meta: {
            outletId: body.outletId,
            categoryId: body.categoryId,
            station: body.station ?? "default",
            isAvailable: true,
            isPopular: false,
            preparationTimeMinutes: body.preparationTimeMinutes ?? 15,
            taxPct: body.taxPct ?? 0,
            thumbnailUrl: body.thumbnailUrl ?? null,
            foodType: body.type ?? "veg",
            tags: body.tags ?? [],
            aggregatorIds: {},
            basePrice: body.basePrice,
            deliveryPrice: body.deliveryPrice ?? body.basePrice,
            sortOrder: body.sortOrder ?? 0,
          },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { data: item };
    })

    .patch("/:id", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const updated = await mediator.dispatch<any>({
        type: "catalog.updateItem",
        payload: { itemId: params.id, organizationId: orgId, ...body },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { data: updated };
    })

    .delete("/:id", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      await mediator.dispatch<any>({
        type: "catalog.deleteItem",
        payload: { itemId: params.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { status: "deleted" };
    })

    // 86-toggle
    .post("/:id/toggle", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const item = await mediator.query<any>({
        type: "catalog.getItem",
        params: { itemId: params.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      if (!item) throw new NotFoundError("Menu item not found");

      const isAvailable = (body as any).available ?? !(item.meta?.isAvailable);

      await mediator.dispatch<any>({
        type: "catalog.updateItemMeta",
        payload: {
          itemId: params.id,
          organizationId: orgId,
          meta: { isAvailable, toggleReason: (body as any).reason ?? null },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await bus.publish(createDomainEvent(
        "rst.menu.item-86d",
        params.id,
        "rst.menu-item",
        { menuItemId: params.id, outletId: item.meta?.outletId, available: isAvailable, orgId },
        orgId,
      ));

      return { menuItemId: params.id, isAvailable };
    })

    // Popular toggle
    .post("/:id/popular", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      await mediator.dispatch<any>({
        type: "catalog.updateItemMeta",
        payload: {
          itemId: params.id,
          organizationId: orgId,
          meta: { isPopular: (body as any).popular ?? true },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { menuItemId: params.id, isPopular: (body as any).popular ?? true };
    })

    // Aggregator IDs mapping
    .patch("/:id/aggregator-ids", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      await mediator.dispatch<any>({
        type: "catalog.updateItemMeta",
        payload: {
          itemId: params.id,
          organizationId: orgId,
          meta: { aggregatorIds: (body as any).aggregatorIds ?? {} },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { status: "updated" };
    });
}

export function categoryRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/categories" })
    .patch("/:id", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const updated = await db
        .update(rstCategories)
        .set({ ...(body as any), updatedAt: new Date() })
        .where(and(eq(rstCategories.id, params.id), eq(rstCategories.organizationId, orgId)))
        .returning();

      return { data: updated[0] };
    })

    .delete("/:id", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      await db
        .update(rstCategories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(rstCategories.id, params.id), eq(rstCategories.organizationId, orgId)));

      return { status: "deleted" };
    });
}

export function modifierRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/modifiers" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const mods = await db.query.rstModifiers.findMany({
        where: eq(rstModifiers.organizationId, orgId),
      });

      return { data: mods };
    })

    .post("/", async (ctx) => {
      const { body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const group = await db
        .insert(rstModifierGroups)
        .values({
          id: generateId(),
          organizationId: orgId,
          name: (body as any).name,
          selectionType: (body as any).type ?? "single",
          required: (body as any).required ?? false,
          minSelect: (body as any).minSelect ?? 0,
          maxSelect: (body as any).maxSelect ?? 1,
          itemIds: [],
          modifierIds: [],
        })
        .returning();

      if ((body as any).options?.length) {
        const modRows = await db
          .insert(rstModifiers)
          .values(
            (body as any).options.map((o: any) => ({
              id: o.id ?? generateId(),
              organizationId: orgId,
              name: o.name,
              priceAdjustment: String(o.additionalPrice ?? 0),
              isAvailable: o.isAvailable ?? true,
            })),
          )
          .returning();

        await db
          .update(rstModifierGroups)
          .set({ modifierIds: modRows.map((m) => m.id) })
          .where(eq(rstModifierGroups.id, group[0].id));
      }

      return { data: group[0] };
    })

    .patch("/:id", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const updated = await db
        .update(rstModifiers)
        .set({ ...(body as any), updatedAt: new Date() })
        .where(and(eq(rstModifiers.id, params.id), eq(rstModifiers.organizationId, orgId)))
        .returning();

      return { data: updated[0] };
    })

    .delete("/:id", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      await db
        .delete(rstModifiers)
        .where(and(eq(rstModifiers.id, params.id), eq(rstModifiers.organizationId, orgId)));

      return { status: "deleted" };
    });
}
