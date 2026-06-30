import { Elysia } from "elysia";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { db } from "@db/client";
import { ecoFulfillments } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator } from "@core";

const deriveStatus = (row: any) => {
  if (row.deliveredAt) return "delivered";
  if (row.shippedAt) return "shipped";
  return "pending";
};

export function createFulfillmentsRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/fulfillments" })
    .get("/", async ({ query }: any) => {
      const { page = 1, limit = 20, status } = query;
      let conditions: any[] = [];
      if (status === "pending") conditions.push(isNull(ecoFulfillments.shippedAt));
      else if (status === "shipped") conditions.push(isNotNull(ecoFulfillments.shippedAt), isNull(ecoFulfillments.deliveredAt));
      else if (status === "delivered") conditions.push(isNotNull(ecoFulfillments.deliveredAt));
      const where = conditions.length ? and(...conditions) : undefined;
      const results = await db.select().from(ecoFulfillments).where(where).limit(Number(limit)).offset((Number(page) - 1) * Number(limit)).orderBy(desc(ecoFulfillments.createdAt));
      return {
        data: results.map((r: any) => ({ ...r, status: deriveStatus(r) })),
        pagination: { page: Number(page), limit: Number(limit) },
      };
    })
    .post("/:id/status", async ({ params, body }: any) => {
      const update: any = {};
      if (body.status === "shipped") update.shippedAt = new Date();
      if (body.status === "delivered") update.deliveredAt = new Date();
      await db.update(ecoFulfillments).set(update).where(eq(ecoFulfillments.id, params.id));
      return { success: true };
    });
}
