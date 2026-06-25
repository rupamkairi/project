import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "@db/client";
import { ecoShippingOptions } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator } from "@core";

export function createShippingRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/shipping" })
    .get("/", async () => {
      const results = await db.select().from(ecoShippingOptions);
      return { data: results };
    })
    .post("/", async ({ body }) => {
      const result = await db.insert(ecoShippingOptions).values({ ...body, id: crypto.randomUUID(), organizationId: "", meta: {}, version: 1 }).returning();
      return result[0];
    })
    .patch("/:id", async ({ params, body }) => {
      const result = await db.update(ecoShippingOptions).set(body).where(eq(ecoShippingOptions.id, params.id)).returning();
      return result[0];
    })
    .delete("/:id", async ({ params }) => {
      await db.delete(ecoShippingOptions).where(eq(ecoShippingOptions.id, params.id));
      return { success: true };
    });
}
