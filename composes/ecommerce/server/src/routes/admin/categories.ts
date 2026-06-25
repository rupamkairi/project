import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "@db/client";
import { catCategories } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator } from "@core";

export function createCategoriesRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/categories" })
    .get("/", async ({ query }: any) => {
      const { page = 1, limit = 50 } = query;
      const results = await db.select().from(catCategories).limit(Number(limit)).offset((Number(page) - 1) * Number(limit));
      return { data: results, pagination: { page: Number(page), limit: Number(limit) } };
    })
    .post("/", async ({ body }: any) => {
      const result = await db.insert(catCategories).values({
        name: body.name,
        slug: body.slug || body.name?.toLowerCase().replace(/\s+/g, "-"),
        parentId: body.parentId && body.parentId !== "None" ? body.parentId : null,
        id: crypto.randomUUID(),
        organizationId: "",
        meta: {},
        version: 1,
      }).returning();
      return result[0];
    })
    .get("/:id", async ({ params }: any) => {
      const result = await db.select().from(catCategories).where(eq(catCategories.id, params.id)).limit(1);
      return result[0] || null;
    })
    .patch("/:id", async ({ params, body }: any) => {
      const update: any = {};
      if (body.name) update.name = body.name;
      if (body.slug) update.slug = body.slug;
      if (body.parentId !== undefined) update.parentId = body.parentId && body.parentId !== "None" ? body.parentId : null;
      if (body.status) update.status = body.status;
      const result = await db.update(catCategories).set(update).where(eq(catCategories.id, params.id)).returning();
      return result[0];
    })
    .delete("/:id", async ({ params }: any) => {
      await db.delete(catCategories).where(eq(catCategories.id, params.id));
      return { success: true };
    });
}
