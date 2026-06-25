import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "@db/client";
import { ecoTaxProfiles, ecoTaxRates } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator } from "@core";

export function createTaxRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/tax" })
    .get("/profiles", async () => {
      const results = await db.select().from(ecoTaxProfiles);
      return { data: results };
    })
    .post("/profiles", async ({ body }) => {
      const result = await db.insert(ecoTaxProfiles).values({ ...body, id: crypto.randomUUID(), organizationId: "", meta: {}, version: 1 }).returning();
      return result[0];
    })
    .get("/profiles/:id/rates", async ({ params }) => {
      const results = await db.select().from(ecoTaxRates).where(eq(ecoTaxRates.taxProfileId, params.id));
      return { data: results };
    })
    .post("/profiles/:id/rates", async ({ params, body }) => {
      const result = await db.insert(ecoTaxRates).values({ ...body, taxProfileId: params.id, id: crypto.randomUUID(), organizationId: "", meta: {}, version: 1 }).returning();
      return result[0];
    })
    .patch("/rates/:rateId", async ({ params, body }) => {
      const result = await db.update(ecoTaxRates).set(body).where(eq(ecoTaxRates.id, params.rateId)).returning();
      return result[0];
    })
    .delete("/rates/:rateId", async ({ params }) => {
      await db.delete(ecoTaxRates).where(eq(ecoTaxRates.id, params.rateId));
      return { success: true };
    });
}
