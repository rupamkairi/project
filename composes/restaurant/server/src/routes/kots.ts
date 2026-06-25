import Elysia from "elysia";
import type { Mediator, EventBus } from "@core";
import { generateId, createDomainEvent, NotFoundError, ConflictError } from "@core";
import { db } from "../lib/db.js";
import { rstKot, rstKotItems } from "../db/schema/restaurant.js";
import { eq, and } from "drizzle-orm";

const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["bumped"],
  cancelled: [],
  bumped: [],
};

export function kdsRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: "/kds" })
    .get("/kots", async ({ request }) => {
      const session = (request as any).session;
      const url = new URL(request.url);
      const outletId = url.searchParams.get("outletId");
      const station = url.searchParams.get("station");
      const kots = await db.query.rstKot.findMany({
        where: eq(rstKot.organizationId, session.orgId),
        with: { items: true },
        orderBy: (t, { asc }) => [asc(t.sentAt)],
      });
      return { data: kots };
    })

    .post("/kots/:id/accept", async ({ params, request }) => {
      const session = (request as any).session;
      const kot = await db.query.rstKot.findFirst({ where: eq(rstKot.id, params.id) });
      if (!kot) throw new NotFoundError("KOT not found");
      const current = kot.status;
      if (!VALID_TRANSITIONS[current]?.includes("accepted")) {
        throw new ConflictError(`KOT cannot transition from ${current} to accepted`);
      }
      await db.update(rstKot)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(rstKot.id, params.id));
      await bus.publish(createDomainEvent(
        "rst.kds.kot-update", params.id, "rst.kot",
        { kotId: params.id, status: "accepted", orgId: session.orgId, station: kot.station },
        session.orgId,
      ));
      return { data: { kotId: params.id, status: "accepted" } };
    })

    .post("/kots/:id/ready", async ({ params, request }) => {
      const session = (request as any).session;
      const kot = await db.query.rstKot.findFirst({ where: eq(rstKot.id, params.id) });
      if (!kot) throw new NotFoundError("KOT not found");
      const validFrom = ["new", "accepted", "preparing"];
      if (!validFrom.includes(kot.status)) {
        throw new ConflictError(`KOT cannot transition from ${kot.status} to ready`);
      }
      await db.update(rstKot)
        .set({ status: "ready", readyAt: new Date() })
        .where(eq(rstKot.id, params.id));
      await bus.publish(createDomainEvent(
        "rst.kot.ready", params.id, "rst.kot",
        { kotId: params.id, orderId: kot.transactionId, orgId: session.orgId },
        session.orgId,
      ));
      return { data: { kotId: params.id, status: "ready" } };
    })

    .post("/kots/:id/bump", async ({ params, request }) => {
      const session = (request as any).session;
      await db.update(rstKot).set({ status: "bumped" }).where(eq(rstKot.id, params.id));
      return { data: { kotId: params.id, status: "bumped" } };
    })

    .ws("/ws/kds/:outletId/:station", {
      open(ws) {
        const { outletId, station } = ws.data.params as any;
        ws.subscribe(`kds:${outletId}:${station}`);
        ws.subscribe(`kds:${outletId}:all`);
      },
      close(ws) {
        const { outletId, station } = ws.data.params as any;
        ws.unsubscribe(`kds:${outletId}:${station}`);
        ws.unsubscribe(`kds:${outletId}:all`);
      },
      message(ws, message) {},
    });
}
