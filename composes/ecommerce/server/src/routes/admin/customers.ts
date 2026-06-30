import { Elysia } from "elysia";
import { eq, like, and, desc } from "drizzle-orm";
import { db } from "@db/client";
import { persons } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator } from "@core";

const toCustomer = (row: any) => ({
  id: row.id,
  email: row.email,
  person: { name: [row.firstName, row.lastName].filter(Boolean).join(" "), email: row.email },
  orderCount: 0,
  totalSpent: 0,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export function createCustomersRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/customers" })
    .get("/", async ({ query }: any) => {
      const { page = 1, limit = 20, search } = query;
      const conditions = [eq(persons.type, "customer")];
      if (search) conditions.push(like(persons.email, `%${search}%`));
      const results = await db.select().from(persons).where(and(...conditions)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit)).orderBy(desc(persons.createdAt));
      return { data: results.map(toCustomer), pagination: { page: Number(page), limit: Number(limit) } };
    })
    .get("/:id", async ({ params }: any) => {
      const result = await db.select().from(persons).where(eq(persons.id, params.id)).limit(1);
      const row = result[0];
      return row ? toCustomer(row) : null;
    });
}
