import { Elysia } from "elysia";
import { eq, desc } from "drizzle-orm";
import { db } from "@db/client";
import { transactions } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator } from "@core";

export function createOrdersRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/orders" })
    .get("/", async ({ query }: any) => {
      const { page = 1, limit = 20 } = query;
      const results = await db.select().from(transactions).where(eq(transactions.type, "order")).limit(Number(limit)).offset((Number(page) - 1) * Number(limit)).orderBy(desc(transactions.createdAt));
      return { data: results, pagination: { page: Number(page), limit: Number(limit) } };
    })
    .get("/:id", async ({ params }: any) => {
      const result = await db.select().from(transactions).where(eq(transactions.id, params.id)).limit(1);
      return result[0] || null;
    });
}
