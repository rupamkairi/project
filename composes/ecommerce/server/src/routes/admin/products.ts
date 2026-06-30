import { Elysia } from "elysia";
import { eq, like, and, desc } from "drizzle-orm";
import { db } from "@db/client";
import { catItems, catVariants, catCategories } from "@projectx/ecommerce-server/db/schema/index";
import type { Mediator } from "@core";

const toProduct = (row: any, opts?: { variants?: any[], category?: any }) => ({
  id: row.id,
  title: row.name,
  handle: row.slug,
  description: row.description,
  categoryId: row.categoryId,
  category: opts?.category?.name ?? null,
  status: row.status,
  tags: row.tags,
  media: row.media,
  attributes: row.attributes,
  variants: opts?.variants ?? [],
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  version: row.version,
});

const toProductRow = (body: any) => ({
  name: body.title,
  slug: body.handle || body.title?.toLowerCase().replace(/\s+/g, "-"),
  description: body.description,
  categoryId: body.categoryId || null,
  status: body.status || "draft",
  tags: body.tags ? (typeof body.tags === "string" ? body.tags.split(",").map((t: string) => t.trim()) : body.tags) : [],
  type: "product" as const,
});

export function createProductsRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/products" })
    .get("/", async ({ query }: any) => {
      const { page = 1, limit = 20, search, status, categoryId } = query;
      const conditions = [eq(catItems.type, "product")];
      if (search) conditions.push(like(catItems.name, `%${search}%`));
      if (status) conditions.push(eq(catItems.status, status as any));
      if (categoryId) conditions.push(eq(catItems.categoryId, categoryId));
      const results = await db.select().from(catItems).where(and(...conditions)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit)).orderBy(desc(catItems.createdAt));
      return { data: results.map((r: any) => toProduct(r)), pagination: { page: Number(page), limit: Number(limit) } };
    })
    .post("/", async ({ body }: any) => {
      const result = await db.insert(catItems).values({ ...toProductRow(body), id: crypto.randomUUID(), organizationId: "", meta: {}, version: 1 }).returning();
      return toProduct(result[0]);
    })
    .get("/:id", async ({ params }: any) => {
      const result = await db.select().from(catItems).where(and(eq(catItems.id, params.id), eq(catItems.type, "product"))).limit(1);
      if (!result[0]) return null;
      const variants = await db.select().from(catVariants).where(eq(catVariants.itemId, params.id));
      let category: any = undefined;
      if (result[0].categoryId) {
        const [cat] = await db.select().from(catCategories).where(eq(catCategories.id, result[0].categoryId)).limit(1);
        category = cat;
      }
      return toProduct(result[0], { variants: variants.map((v: any) => ({ ...v, options: v.attributes ?? {}, stockQty: 0, price: 0, compareAtPrice: null })), category });
    })
    .get("/:id/variants", async ({ params }: any) => {
      const results = await db.select().from(catVariants).where(eq(catVariants.itemId, params.id));
      return { data: results.map((v: any) => ({ ...v, options: v.attributes ?? {}, stockQty: 0, price: 0, compareAtPrice: null })) };
    })
    .post("/:id/variants", async ({ params, body }: any) => {
      const row: any = {
        itemId: params.id,
        sku: body.sku,
        attributes: body.options ? (typeof body.options === "string" ? JSON.parse(body.options) : body.options) : {},
        status: body.status || "active",
      };
      if (body.stockTracked !== undefined) row.stockTracked = body.stockTracked;
      const result = await db.insert(catVariants).values({ ...row, id: crypto.randomUUID(), organizationId: "", meta: {}, version: 1 }).returning();
      return result[0];
    })
    .get("/:id/variants/:variantId", async ({ params }: any) => {
      const result = await db.select().from(catVariants).where(and(eq(catVariants.id, params.variantId), eq(catVariants.itemId, params.id))).limit(1);
      if (!result[0]) return null;
      return { ...result[0], options: result[0].attributes ?? {}, stockQty: 0, price: 0, compareAtPrice: null };
    })
    .patch("/:id/variants/:variantId", async ({ params, body }: any) => {
      const update: any = {};
      if (body.sku) update.sku = body.sku;
      if (body.options) update.attributes = typeof body.options === "string" ? JSON.parse(body.options) : body.options;
      if (body.status) update.status = body.status;
      if (body.stockTracked !== undefined) update.stockTracked = body.stockTracked;
      const result = await db.update(catVariants).set(update).where(and(eq(catVariants.id, params.variantId), eq(catVariants.itemId, params.id))).returning();
      return result[0];
    })
    .delete("/:id/variants/:variantId", async ({ params }: any) => {
      await db.delete(catVariants).where(and(eq(catVariants.id, params.variantId), eq(catVariants.itemId, params.id)));
      return { success: true };
    })
    .patch("/:id", async ({ params, body }: any) => {
      const update: any = {};
      if (body.title) update.name = body.title;
      if (body.handle) update.slug = body.handle;
      if (body.description !== undefined) update.description = body.description;
      if (body.categoryId !== undefined) update.categoryId = body.categoryId || null;
      if (body.status) update.status = body.status;
      if (body.tags) update.tags = typeof body.tags === "string" ? body.tags.split(",").map((t: string) => t.trim()) : body.tags;
      if (body.media) update.media = body.media;
      const result = await db.update(catItems).set(update).where(eq(catItems.id, params.id)).returning();
      return toProduct(result[0]);
    })
    .delete("/:id", async ({ params }: any) => {
      await db.delete(catVariants).where(eq(catVariants.itemId, params.id));
      await db.delete(catItems).where(eq(catItems.id, params.id));
      return { success: true };
    })
    .post("/:id/publish", async ({ params }: any) => {
      const result = await db.update(catItems).set({ status: "active" }).where(eq(catItems.id, params.id)).returning();
      return toProduct(result[0]);
    })
    .post("/:id/unpublish", async ({ params }: any) => {
      const result = await db.update(catItems).set({ status: "draft" }).where(eq(catItems.id, params.id)).returning();
      return toProduct(result[0]);
    });
}
