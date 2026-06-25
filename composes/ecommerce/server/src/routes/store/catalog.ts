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
  price: 0,
  compareAtPrice: null,
  imageUrl: null,
});

export function createCatalogRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/products" })
    .get("/", async ({ query }: any) => {
      const { page = 1, limit = 20, search, categoryId } = query;
      const conditions = [eq(catItems.type, "product"), eq(catItems.status, "active")];
      if (search) conditions.push(like(catItems.name, `%${search}%`));
      if (categoryId) conditions.push(eq(catItems.categoryId, categoryId));
      const results = await db.select().from(catItems).where(and(...conditions)).limit(Number(limit)).offset((Number(page) - 1) * Number(limit)).orderBy(desc(catItems.createdAt));
      return { data: results.map((r) => toProduct(r)), pagination: { page: Number(page), limit: Number(limit) } };
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
      return toProduct(result[0], { variants, category });
    });
}
