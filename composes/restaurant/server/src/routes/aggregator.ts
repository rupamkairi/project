import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent } from "@core";
import { db } from "../lib/db.js";
import { rstAggregatorMappings } from "../db/schema/restaurant.js";
import { and, eq } from "drizzle-orm";

export function createAggregatorRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/aggregators" })
    .get("/", async ({ request }) => {
      const session = (request as any).session;
      const url = new URL(request.url);
      const outletId = url.searchParams.get("outletId");
      const mappings = await db.query.rstAggregatorMappings.findMany({
        where: and(
          eq(rstAggregatorMappings.organizationId, session.orgId),
          outletId ? eq(rstAggregatorMappings.locationId, outletId) : undefined,
        ),
      });
      return {
        data: mappings.map((m) => ({
          ...m,
          meta: { storeId: m.storeId, active: m.isActive, syncStatus: m.syncStatus, lastSyncAt: m.lastSyncAt },
        })),
      };
    })

    .post("/", async ({ body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const [mapping] = await db.insert(rstAggregatorMappings).values({
        organizationId: session.orgId,
        locationId: input.outletId,
        platform: input.platform,
        storeId: input.storeId,
        isActive: true,
      }).returning();
      return { data: mapping };
    })

    .patch("/:id", async ({ params, body, request }) => {
      const session = (request as any).session;
      const input = body as any;
      const [updated] = await db.update(rstAggregatorMappings)
        .set({ isActive: input.active })
        .where(eq(rstAggregatorMappings.id, params.id))
        .returning();
      return { data: updated };
    })

    .post("/:id/test", async ({ params, request }) => {
      const mapping = await db.query.rstAggregatorMappings.findFirst({
        where: eq(rstAggregatorMappings.id, params.id),
      });
      await db.update(rstAggregatorMappings)
        .set({ syncStatus: mapping?.isActive ? "ok" : "error", lastSyncAt: new Date() })
        .where(eq(rstAggregatorMappings.id, params.id));
      return { data: { ok: true } };
    })

    .post("/webhook/:platform", async ({ params, body, request }) => {
      const input = body as any;
      await bus.publish(createDomainEvent(
        "rst.aggregator.webhook", generateId(), "rst.aggregator",
        { source: params.platform, payload: input },
        input.orgId ?? "unknown",
      ));
      return { data: { received: true } };
    });
}
