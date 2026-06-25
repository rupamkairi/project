import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { createDomainEvent } from "@core";
import { ConflictError, NotFoundError } from "@core";
import { db } from "@db/client";
import { eq, and } from "drizzle-orm";
import { rstKot, rstKotItems } from "../db/schema/restaurant";

const VALID_TRANSITIONS: Record<string, string[]> = {
  sent: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: [],
  cancelled: [],
};

function assertTransition(current: string, next: string) {
  if (!VALID_TRANSITIONS[current]?.includes(next)) {
    throw new ConflictError(`KOT cannot transition from ${current} to ${next}`);
  }
}

export function kotRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/kots" })
    .get("/", async (ctx) => {
      const q = (ctx as any).query ?? {};
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const kots = await db.query.rstKot.findMany({
        where: and(
          eq(rstKot.organizationId, orgId),
          q.station ? eq(rstKot.station, q.station) : undefined,
          q.status ? eq(rstKot.status, q.status) : undefined,
        ),
        orderBy: (t, { asc }) => [asc(t.sentAt)],
      });

      return { data: kots };
    })

    .get("/:id", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const kot = await db.query.rstKot.findFirst({
        where: and(eq(rstKot.id, params.id), eq(rstKot.organizationId, orgId)),
      });

      if (!kot) throw new NotFoundError("KOT not found");

      const items = await db.query.rstKotItems.findMany({
        where: eq(rstKotItems.kotId, params.id),
      });

      return { ...kot, items };
    })

    .post("/:id/accept", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const kot = await db.query.rstKot.findFirst({
        where: and(eq(rstKot.id, params.id), eq(rstKot.organizationId, orgId)),
      });

      if (!kot) throw new NotFoundError("KOT not found");
      assertTransition(kot.status, "accepted");

      const updated = await db
        .update(rstKot)
        .set({ status: "accepted", acceptedAt: new Date(), updatedAt: new Date() })
        .where(eq(rstKot.id, params.id))
        .returning();

      await bus.publish(createDomainEvent(
        "rst.kds.kot-update",
        params.id,
        "rst.kot",
        { kotId: params.id, status: "accepted", outletId: kot.locationId, station: kot.station, orgId },
        orgId,
      ));

      return { data: updated[0] };
    })

    .post("/:id/start", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const kot = await db.query.rstKot.findFirst({
        where: and(eq(rstKot.id, params.id), eq(rstKot.organizationId, orgId)),
      });

      if (!kot) throw new NotFoundError("KOT not found");
      assertTransition(kot.status, "preparing");

      const updated = await db
        .update(rstKot)
        .set({ status: "preparing", prepStartAt: new Date(), updatedAt: new Date() })
        .where(eq(rstKot.id, params.id))
        .returning();

      await bus.publish(createDomainEvent(
        "rst.kds.kot-update",
        params.id,
        "rst.kot",
        { kotId: params.id, status: "preparing", outletId: kot.locationId, station: kot.station, orgId },
        orgId,
      ));

      return { data: updated[0] };
    })

    .post("/:id/ready", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const kot = await db.query.rstKot.findFirst({
        where: and(eq(rstKot.id, params.id), eq(rstKot.organizationId, orgId)),
      });

      if (!kot) throw new NotFoundError("KOT not found");
      assertTransition(kot.status, "ready");

      const updated = await db
        .update(rstKot)
        .set({ status: "ready", readyAt: new Date(), updatedAt: new Date() })
        .where(eq(rstKot.id, params.id))
        .returning();

      await bus.publish(createDomainEvent(
        "rst.kds.kot-update",
        params.id,
        "rst.kot",
        { kotId: params.id, status: "ready", outletId: kot.locationId, station: kot.station, orgId },
        orgId,
      ));

      await bus.publish(createDomainEvent(
        "rst.kot.ready",
        params.id,
        "rst.kot",
        { kotId: params.id, orderId: kot.transactionId, orgId },
        orgId,
      ));

      return { data: updated[0] };
    })

    .post("/:id/cancel", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const kot = await db.query.rstKot.findFirst({
        where: and(eq(rstKot.id, params.id), eq(rstKot.organizationId, orgId)),
      });

      if (!kot) throw new NotFoundError("KOT not found");
      assertTransition(kot.status, "cancelled");

      const updated = await db
        .update(rstKot)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(rstKot.id, params.id))
        .returning();

      await db
        .update(rstKotItems)
        .set({ status: "voided" })
        .where(eq(rstKotItems.kotId, params.id));

      await bus.publish(createDomainEvent(
        "rst.kds.kot-update",
        params.id,
        "rst.kot",
        { kotId: params.id, status: "cancelled", outletId: kot.locationId, station: kot.station, orgId },
        orgId,
      ));

      return { data: updated[0] };
    });
}
