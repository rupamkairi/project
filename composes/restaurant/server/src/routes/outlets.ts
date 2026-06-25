import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent } from "@core";
import { ConflictError, NotFoundError } from "@core";
import { db } from "@db/client";
import { eq, and } from "drizzle-orm";
import { rstKot } from "../db/schema/restaurant";

export function outletRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/outlets" })
    .get("/", async (ctx) => {
      const q = (ctx as any).query ?? {};
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId ?? q.orgId;

      const result = await mediator.query<any>({
        type: "location.listLocations",
        params: { type: "outlet", organizationId: orgId, limit: 100 },
        actorId: actor?.id ?? "system",
        orgId,
      });

      return { data: result?.items ?? result ?? [] };
    })

    .get("/:id", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const outlet = await mediator.query<any>({
        type: "location.getLocation",
        params: { locationId: params.id },
        actorId: actor?.id ?? "system",
        orgId,
      });

      if (!outlet) throw new NotFoundError("Outlet not found");
      return outlet;
    })

    .post("/", async (ctx) => {
      const body = (ctx as any).body as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const outlet = await mediator.dispatch<any>({
        type: "location.createLocation",
        payload: {
          type: "outlet",
          organizationId: orgId,
          name: body.name,
          code: body.code,
          capacity: body.capacity,
          status: "active",
          meta: {
            address: body.address,
            phone: body.phone,
            acceptsDelivery: body.acceptsDelivery ?? true,
            acceptsDineIn: body.acceptsDineIn ?? true,
            acceptsTakeaway: body.acceptsTakeaway ?? true,
            deliveryRadius: body.deliveryRadius ?? 5,
            preparationTimeMinutes: body.preparationTimeMinutes ?? 20,
            operatingHours: body.operatingHours ?? {},
            timezone: body.timezone ?? "Asia/Kolkata",
            aggregatorIds: {},
            lastOrderSeq: 0,
            lastKotSeq: 0,
            lastBillSeq: 0,
          },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { data: outlet };
    })

    .patch("/:id", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const updated = await mediator.dispatch<any>({
        type: "location.updateLocation",
        payload: { locationId: params.id, ...body },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { data: updated };
    })

    .post("/:id/open", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      await mediator.dispatch<any>({
        type: "location.updateStatus",
        payload: { locationId: params.id, status: "active" },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await bus.publish(createDomainEvent(
        "rst.outlet.opened",
        params.id,
        "rst.outlet",
        { outletId: params.id, orgId },
        orgId,
      ));
      return { status: "opened" };
    })

    .post("/:id/close", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const activeKots = await db.query.rstKot.findMany({
        where: and(
          eq(rstKot.locationId, params.id),
          eq(rstKot.organizationId, orgId),
        ),
      });
      const pending = activeKots.filter((k) =>
        ["sent", "accepted", "preparing"].includes(k.status),
      );
      if (pending.length > 0) {
        throw new ConflictError(`${pending.length} active KOTs remain`);
      }

      await mediator.dispatch<any>({
        type: "location.updateStatus",
        payload: { locationId: params.id, status: "inactive" },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await bus.publish(createDomainEvent(
        "rst.outlet.closed",
        params.id,
        "rst.outlet",
        { outletId: params.id, orgId },
        orgId,
      ));
      return { status: "closed" };
    })

    .post("/:id/pause", async (ctx) => {
      const body = (ctx as any).body as any;
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      if (!body.reason) throw new ConflictError("pauseReason required");

      await mediator.dispatch<any>({
        type: "location.updateMeta",
        payload: { locationId: params.id, meta: { pauseReason: body.reason, pausedAt: new Date().toISOString() } },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      await mediator.dispatch<any>({
        type: "location.updateStatus",
        payload: { locationId: params.id, status: "inactive" },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { status: "paused" };
    })

    // Tables routes nested under outlet
    .get("/:id/tables", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const result = await mediator.query<any>({
        type: "location.listLocations",
        params: { type: "table", parentId: params.id, organizationId: orgId, limit: 200 },
        actorId: actor?.id ?? "system",
        orgId,
      });

      return { data: result?.items ?? result ?? [] };
    })

    .post("/:id/tables", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const table = await mediator.dispatch<any>({
        type: "location.createLocation",
        payload: {
          type: "table",
          organizationId: orgId,
          name: body.name ?? `Table ${body.code}`,
          code: body.code,
          capacity: body.capacity,
          parentId: params.id,
          status: "active",
          meta: { section: body.section ?? "indoor" },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { data: table };
    })

    // Categories routes
    .get("/:id/categories", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const { rstCategories } = await import("../db/schema/restaurant");
      const cats = await db.query.rstCategories.findMany({
        where: and(
          eq(rstCategories.organizationId, orgId),
          eq(rstCategories.isActive, true),
        ),
        orderBy: (t, { asc }) => [asc(t.sortOrder)],
      });

      return { data: cats };
    })

    .post("/:id/categories", async (ctx) => {
      const { body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const { rstCategories } = await import("../db/schema/restaurant");
      const cat = await db
        .insert(rstCategories)
        .values({
          id: generateId(),
          organizationId: orgId,
          name: body.name,
          sortOrder: body.sortOrder ?? 0,
          parentId: body.parentId ?? null,
          mealPeriod: body.mealPeriod ?? "all",
          isActive: true,
        })
        .returning();

      return { data: cat[0] };
    })

    // Menu routes
    .get("/:id/menu", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const items = await mediator.query<any>({
        type: "catalog.listItems",
        params: {
          type: "menu_item",
          organizationId: orgId,
          limit: 500,
        },
        actorId: actor?.id ?? "system",
        orgId,
      });

      const menuItems = (items?.items ?? items ?? []).filter(
        (i: any) => i.meta?.outletId === params.id,
      );

      return { data: menuItems };
    });
}
