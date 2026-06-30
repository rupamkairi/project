import { Elysia } from "elysia";
import { eq, and } from "drizzle-orm";
import { db } from "@db/client";
import { ecoReturns, ecoReturnItems } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator, AdapterRegistry } from "@core";

export function createReturnsRoutes(mediator: Mediator, adapters: AdapterRegistry) {
  return new Elysia({ prefix: "/returns" })
    .get("/", async ({ query }) => {
      const { page = 1, limit = 20, status } = query;
      const where = status ? eq(ecoReturns.status, status) : undefined;
      const results = await db.select().from(ecoReturns).where(where).limit(limit).offset((page - 1) * limit);
      return { data: results, pagination: { page, limit } };
    })
    .get("/:id", async ({ params }) => {
      const result = await db.select().from(ecoReturns).where(eq(ecoReturns.id, params.id)).limit(1);
      return result[0] || null;
    })
    .post("/:id/approve", async ({ params }) => {
      await db.update(ecoReturns).set({ status: "approved", approvedAt: new Date() }).where(eq(ecoReturns.id, params.id));
      return { success: true };
    })
    .post("/:id/reject", async ({ params }) => {
      await db.update(ecoReturns).set({ status: "rejected" }).where(eq(ecoReturns.id, params.id));
      return { success: true };
    })
    .post("/:id/receive", async ({ params }) => {
      await db.update(ecoReturns).set({ status: "received", receivedAt: new Date() }).where(eq(ecoReturns.id, params.id));
      return { success: true };
    });
}
