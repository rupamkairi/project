import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "@db/client";
import { catCategories } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator } from "@core";

export function createStoreCategoriesRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/categories" })
    .get("/", async () => {
      const results = await db.select().from(catCategories).where(eq(catCategories.status, "active"));
      return { data: results };
    })
    .get("/:id", async ({ params }: any) => {
      const result = await db.select().from(catCategories).where(eq(catCategories.id, params.id)).limit(1);
      return result[0] || null;
    });
}
