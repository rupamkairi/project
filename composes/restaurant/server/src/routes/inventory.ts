import Elysia from "elysia";
import type { Mediator } from "@core";
import { generateId } from "@core";
import { ConflictError, NotFoundError } from "@core";
import { db } from "@db/client";
import { eq, and } from "drizzle-orm";
import { rstRecipes, rstRecipeIngredients } from "../db/schema/restaurant";

export function inventoryRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/admin/ingredients" })
    .get("/", async (ctx) => {
      const q = (ctx as any).query ?? {};
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const items = await mediator.query<any>({
        type: "catalog.listItems",
        params: { type: "stock_item", organizationId: orgId, limit: 500 },
        actorId: actor?.id ?? "system",
        orgId,
      });

      return { data: items?.items ?? items ?? [] };
    })

    .get("/alerts", async (ctx) => {
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const alerts = await mediator.query<any>({
        type: "inventory.listLowStock",
        params: { organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
      }).catch(async () => {
        // Fallback: read stock items and filter
        const items = await mediator.query<any>({
          type: "catalog.listItems",
          params: { type: "stock_item", organizationId: orgId, limit: 500 },
          actorId: actor?.id ?? "system",
          orgId,
        });
        return (items?.items ?? items ?? []).filter(
          (i: any) =>
            parseFloat(i.meta?.currentStock ?? "0") <=
            parseFloat(i.meta?.reorderLevel ?? "0"),
        );
      });

      return { data: alerts };
    })

    .post("/", async (ctx) => {
      const { body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const item = await mediator.dispatch<any>({
        type: "catalog.createItem",
        payload: {
          type: "stock_item",
          organizationId: orgId,
          name: (body as any).name,
          sku: `ING-${generateId().slice(0, 8).toUpperCase()}`,
          meta: {
            outletId: (body as any).outletId,
            unit: (body as any).unit,
            currentStock: String((body as any).currentStock ?? 0),
            reorderLevel: String((body as any).reorderLevel ?? 0),
            costPerUnit: String((body as any).costPerUnit ?? 0),
          },
        },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { data: item };
    })

    .patch("/:id", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const updated = await mediator.dispatch<any>({
        type: "catalog.updateItem",
        payload: { itemId: params.id, organizationId: orgId, ...(body as any) },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { data: updated };
    })

    .post("/:id/adjust", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;
      const { qty, reason, notes, force } = body as any;

      const item = await mediator.query<any>({
        type: "catalog.getItem",
        params: { itemId: params.id, organizationId: orgId },
        actorId: actor?.id ?? "system",
        orgId,
      });

      if (!item) throw new NotFoundError("Ingredient not found");

      const current = parseFloat(item.meta?.currentStock ?? "0");
      const newStock = current + qty;

      if (newStock < 0 && !force) {
        throw new ConflictError(`Adjustment would result in negative stock: ${newStock}`);
      }

      await mediator.dispatch<any>({
        type: "inventory.adjustStock",
        payload: { itemId: params.id, qty, organizationId: orgId, reason, force },
        actorId: actor?.id ?? "system",
        orgId,
        correlationId: generateId(),
      });

      return { newStock, reason };
    })

    .post("/purchase", async (ctx) => {
      const { body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      for (const item of (body as any).items ?? []) {
        await mediator.dispatch<any>({
          type: "inventory.adjustStock",
          payload: {
            itemId: item.ingredientId,
            qty: item.qty,
            organizationId: orgId,
            reason: "purchase",
          },
          actorId: actor?.id ?? "system",
          orgId,
          correlationId: generateId(),
        });

        if (item.unitCost) {
          await mediator.dispatch<any>({
            type: "catalog.updateItemMeta",
            payload: {
              itemId: item.ingredientId,
              organizationId: orgId,
              meta: { costPerUnit: String(item.unitCost) },
            },
            actorId: actor?.id ?? "system",
            orgId,
            correlationId: generateId(),
          });
        }
      }

      return { status: "purchased", count: (body as any).items?.length ?? 0 };
    });
}

export function recipeRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/admin/recipes" })
    .get("/", async (ctx) => {
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const recipes = await db.query.rstRecipes.findMany({
        where: eq(rstRecipes.organizationId, orgId),
      });

      return { data: recipes };
    });
}

export function menuRecipeRoutes(mediator: Mediator) {
  return new Elysia({ prefix: "/admin/menu" })
    .post("/:id/recipe", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      // Deactivate existing recipe
      await db
        .update(rstRecipes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(rstRecipes.itemId, params.id), eq(rstRecipes.organizationId, orgId)));

      const recipe = await db
        .insert(rstRecipes)
        .values({
          id: generateId(),
          organizationId: orgId,
          itemId: params.id,
          isActive: true,
        })
        .returning();

      await db.insert(rstRecipeIngredients).values(
        ((body as any).ingredients ?? []).map((ing: any) => ({
          id: generateId(),
          organizationId: orgId,
          recipeId: recipe[0].id,
          itemId: ing.ingredientId,
          qty: String(ing.qty),
          unit: ing.unit,
        })),
      );

      return { data: recipe[0] };
    })

    .patch("/:id/recipe", async (ctx) => {
      const { params, body } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      const recipe = await db.query.rstRecipes.findFirst({
        where: and(
          eq(rstRecipes.itemId, params.id),
          eq(rstRecipes.organizationId, orgId),
          eq(rstRecipes.isActive, true),
        ),
      });

      if (!recipe) throw new NotFoundError("Recipe not found");

      if ((body as any).ingredients) {
        await db.delete(rstRecipeIngredients).where(eq(rstRecipeIngredients.recipeId, recipe.id));
        await db.insert(rstRecipeIngredients).values(
          (body as any).ingredients.map((ing: any) => ({
            id: generateId(),
            organizationId: orgId,
            recipeId: recipe.id,
            itemId: ing.ingredientId,
            qty: String(ing.qty),
            unit: ing.unit,
          })),
        );
      }

      return { data: recipe };
    })

    .delete("/:id/recipe", async (ctx) => {
      const { params } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;

      await db
        .update(rstRecipes)
        .set({ isActive: false })
        .where(and(eq(rstRecipes.itemId, params.id), eq(rstRecipes.organizationId, orgId)));

      return { status: "deleted" };
    })

    .get("/:id/stock-impact", async (ctx) => {
      const { params, query } = ctx as any;
      const actor = (ctx as any).actor;
      const orgId = actor?.orgId;
      const qty = parseInt((query as any).qty ?? "1");

      const recipe = await db.query.rstRecipes.findFirst({
        where: and(
          eq(rstRecipes.itemId, params.id),
          eq(rstRecipes.organizationId, orgId),
          eq(rstRecipes.isActive, true),
        ),
      });

      if (!recipe) return { impact: [] };

      const ingredients = await db.query.rstRecipeIngredients.findMany({
        where: eq(rstRecipeIngredients.recipeId, recipe.id),
      });

      const impact = await Promise.all(
        ingredients.map(async (ing) => {
          const ingredient = await mediator.query<any>({
            type: "catalog.getItem",
            params: { itemId: ing.itemId, organizationId: orgId },
            actorId: actor?.id ?? "system",
            orgId,
          });

          const currentStock = parseFloat(ingredient?.meta?.currentStock ?? "0");
          const needed = parseFloat(ing.qty) * qty;

          return {
            ingredientId: ing.itemId,
            name: ingredient?.name,
            unit: ing.unit,
            perUnit: parseFloat(ing.qty),
            total: needed,
            currentStock,
            afterDeduction: currentStock - needed,
            willCauseStockout: currentStock < needed,
          };
        }),
      );

      return { impact };
    });
}
