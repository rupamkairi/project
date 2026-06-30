import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "@db/client";
import { ecoRegions } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator } from "@core";

export function createRegionsRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/regions" })
    .get("/", async () => {
      const results = await db.select().from(ecoRegions);
      return { data: results };
    })
    .post("/", async ({ body }) => {
      const result = await db.insert(ecoRegions).values({ ...body, id: crypto.randomUUID(), organizationId: "", meta: {}, version: 1 }).returning();
      return result[0];
    })
    .get("/:id", async ({ params }) => {
      const result = await db.select().from(ecoRegions).where(eq(ecoRegions.id, params.id)).limit(1);
      return result[0] || null;
    })
    .patch("/:id", async ({ params, body }) => {
      const result = await db.update(ecoRegions).set(body).where(eq(ecoRegions.id, params.id)).returning();
      return result[0];
    })
    .delete("/:id", async ({ params }) => {
      await db.delete(ecoRegions).where(eq(ecoRegions.id, params.id));
      return { success: true };
    });
}
