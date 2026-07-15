import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, createDomainEvent, NotFoundError, ConflictError, ValidationError } from '@core'
import { db } from '../lib/db.js'
import { rstRecipes, rstRecipeIngredients, rstStockMovements } from '../db/schema/restaurant.js'
import { and, eq, gte, lte } from 'drizzle-orm'

export function createInventoryRoutes(mediator: Mediator, bus: EventBus) {
  return (
    new Elysia({ prefix: '/inventory' })
      // ── Ingredients ──
      .get('/ingredients', async ({ request }) => {
        const session = (request as any).session
        const url = new URL(request.url)
        const outletId = url.searchParams.get('outletId')
        const lowStock = url.searchParams.get('lowStock')
        const items = (await mediator
          .query({
            type: 'catalog.listItems',
            params: { orgId: session.orgId, type: 'stock_item' },
            actorId: session.actorId,
            orgId: session.orgId,
          })
          .catch(() => [])) as any[]

        let result = items.map((i) => ({
          id: i.id,
          name: i.name,
          stock: parseFloat(String(i.meta?.currentStock ?? 0)),
          unit: i.meta?.unit ?? 'pcs',
          reorderLevel: parseFloat(String(i.meta?.reorderLevel ?? 0)),
          costPerUnit: parseFloat(String(i.meta?.costPerUnit ?? 0)),
          outletId: i.meta?.outletId,
        }))

        if (lowStock === 'true') {
          result = result.filter((i) => i.stock <= i.reorderLevel && i.reorderLevel > 0)
        }
        return { data: result }
      })

      .get('/ingredients/:id', async ({ params, request }) => {
        const session = (request as any).session
        const item = await mediator.query({
          type: 'catalog.getItem',
          params: { itemId: params.id },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        if (!item) throw new NotFoundError('Ingredient not found')
        const itemData = item as any
        const movements = await db.query.rstStockMovements.findMany({
          where: and(
            eq(rstStockMovements.itemId, params.id),
            eq(rstStockMovements.organizationId, session.orgId),
          ),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 50,
        })
        return {
          data: {
            id: itemData.id,
            name: itemData.name,
            stock: parseFloat(String(itemData.meta?.currentStock ?? 0)),
            unit: itemData.meta?.unit ?? 'pcs',
            reorderLevel: parseFloat(String(itemData.meta?.reorderLevel ?? 0)),
            costPerUnit: parseFloat(String(itemData.meta?.costPerUnit ?? 0)),
            movements,
          },
        }
      })

      .post('/ingredients/:id/adjust', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const item = await mediator.query({
          type: 'catalog.getItem',
          params: { itemId: params.id },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        if (!item) throw new NotFoundError('Ingredient not found')
        const itemData = item as any
        const currentStock = parseFloat(String(itemData.meta?.currentStock ?? 0))
        const newStock = currentStock + input.delta
        if (newStock < 0)
          throw new ConflictError(`Adjustment would result in negative stock: ${newStock}`)
        await mediator.dispatch({
          type: 'catalog.updateItem',
          payload: { itemId: params.id, meta: { ...itemData.meta, currentStock: newStock } },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })

        const movementType =
          input.delta > 0 ? 'receipt' : input.delta < 0 ? 'wastage' : 'adjustment'
        await db.insert(rstStockMovements).values({
          id: generateId(),
          organizationId: session.orgId,
          itemId: params.id,
          outletId: input.outletId ?? itemData.meta?.outletId ?? 'unknown',
          movementType,
          qty: String(Math.abs(input.delta)),
          unit: itemData.meta?.unit ?? 'pcs',
          beforeQty: String(currentStock),
          afterQty: String(newStock),
          reason: input.reason,
          costPerUnit: itemData.meta?.costPerUnit,
          performedBy: session.actorId,
        })
        return { data: { itemId: params.id, newStock, delta: input.delta } }
      })

      .post('/ingredients/:id/transfer', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const item = await mediator.query({
          type: 'catalog.getItem',
          params: { itemId: params.id },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        if (!item) throw new NotFoundError('Ingredient not found')
        const itemData = item as any
        const currentStock = parseFloat(String(itemData.meta?.currentStock ?? 0))
        const transferQty = input.qty
        if (transferQty > currentStock) throw new ConflictError('Insufficient stock for transfer')
        const newStock = currentStock - transferQty

        await mediator.dispatch({
          type: 'catalog.updateItem',
          payload: { itemId: params.id, meta: { ...itemData.meta, currentStock: newStock } },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })

        await db.insert(rstStockMovements).values({
          id: generateId(),
          organizationId: session.orgId,
          itemId: params.id,
          outletId: input.outletId ?? itemData.meta?.outletId ?? 'unknown',
          movementType: 'transfer-out',
          qty: String(transferQty),
          unit: itemData.meta?.unit ?? 'pcs',
          beforeQty: String(currentStock),
          afterQty: String(newStock),
          reason: input.reason,
          performedBy: session.actorId,
        })
        return {
          data: {
            itemId: params.id,
            newStock,
            transferred: transferQty,
            toOutlet: input.toOutletId,
          },
        }
      })

      .post('/ingredients/receive', async ({ body, request }) => {
        const session = (request as any).session
        const input = body as any
        const item = await mediator.query({
          type: 'catalog.getItem',
          params: { itemId: input.itemId },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        if (!item) throw new NotFoundError('Ingredient not found')
        const itemData = item as any
        const currentStock = parseFloat(String(itemData.meta?.currentStock ?? 0))
        const newStock = currentStock + input.qty

        await mediator.dispatch({
          type: 'catalog.updateItem',
          payload: { itemId: input.itemId, meta: { ...itemData.meta, currentStock: newStock } },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })

        await db.insert(rstStockMovements).values({
          id: generateId(),
          organizationId: session.orgId,
          itemId: input.itemId,
          outletId: input.outletId ?? itemData.meta?.outletId ?? 'unknown',
          movementType: 'receipt',
          qty: String(input.qty),
          unit: itemData.meta?.unit ?? 'pcs',
          beforeQty: String(currentStock),
          afterQty: String(newStock),
          reason: input.reason,
          costPerUnit: input.costPerUnit ?? itemData.meta?.costPerUnit,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          performedBy: session.actorId,
        })
        return { data: { itemId: input.itemId, newStock, received: input.qty } }
      })

      // ── Recipes ──
      .get('/recipes', async ({ request }) => {
        const session = (request as any).session
        const url = new URL(request.url)
        const itemId = url.searchParams.get('itemId')
        const where: any[] = [
          eq(rstRecipes.organizationId, session.orgId),
          eq(rstRecipes.isActive, true),
        ]
        if (itemId) where.push(eq(rstRecipes.itemId, itemId))
        const recipes = await db.query.rstRecipes.findMany({
          where: and(...where),
          with: { ingredients: true },
          orderBy: (t, { desc }) => [desc(t.version)],
        })
        return { data: recipes }
      })

      .get('/recipes/:id', async ({ params, request }) => {
        const recipe = await db.query.rstRecipes.findFirst({
          where: eq(rstRecipes.id, params.id),
        } as any)
        if (!recipe) throw new NotFoundError('Recipe not found')
        return { data: recipe }
      })

      .post('/recipes', async ({ body, request }) => {
        const session = (request as any).session
        const input = body as any
        const latest = await db.query.rstRecipes.findFirst({
          where: and(eq(rstRecipes.itemId, input.itemId), eq(rstRecipes.isActive, true)),
          orderBy: (t, { desc }) => [desc(t.version)],
        })
        const version = (latest?.version ?? 0) + 1
        const [recipe] = await db
          .insert(rstRecipes)
          .values({
            id: generateId(),
            organizationId: session.orgId,
            itemId: input.itemId,
            name: input.name,
            version,
            yieldQty: input.yieldQty,
            yieldUnit: input.yieldUnit ?? 'portions',
            instructions: input.instructions,
            prepTimeMinutes: input.prepTimeMinutes,
            cookTimeMinutes: input.cookTimeMinutes,
            createdBy: session.actorId,
          })
          .returning()

        if (recipe && input.ingredients?.length) {
          for (const ing of input.ingredients) {
            await db.insert(rstRecipeIngredients).values({
              id: generateId(),
              organizationId: session.orgId,
              recipeId: recipe.id,
              itemId: ing.itemId,
              qty: String(ing.qty),
              unit: ing.unit,
              wastagePct: ing.wastagePct ?? '0',
              isOptional: ing.isOptional ?? false,
            })
          }
        }
        return { data: recipe }
      })

      .post('/recipes/:id/deactivate', async ({ params, request }) => {
        await db
          .update(rstRecipes)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(rstRecipes.id, params.id))
        return { data: { recipeId: params.id, isActive: false } }
      })

      .post('/recipes/:id/consume', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const recipe = await db.query.rstRecipes.findFirst({
          where: eq(rstRecipes.id, params.id),
          with: { ingredients: true },
        })
        if (!recipe) throw new NotFoundError('Recipe not found')
        const multiplier = input.portions ?? 1
        for (const ing of (recipe as any).ingredients ?? []) {
          const qty = parseFloat(String((ing as any).qty)) * multiplier
          const item = (await mediator
            .query({
              type: 'catalog.getItem',
              params: { itemId: ing.itemId },
              actorId: session.actorId,
              orgId: session.orgId,
            })
            .catch(() => null)) as any
          if (!item) continue
          const currentStock = parseFloat(String(item.meta?.currentStock ?? 0))
          const newStock = currentStock - qty
          await mediator.dispatch({
            type: 'catalog.updateItem',
            payload: { itemId: ing.itemId, meta: { ...item.meta, currentStock: newStock } },
            actorId: session.actorId,
            orgId: session.orgId,
            correlationId: generateId(),
          })
          await db.insert(rstStockMovements).values({
            id: generateId(),
            organizationId: session.orgId,
            itemId: ing.itemId,
            outletId: input.outletId ?? 'unknown',
            movementType: 'consumption',
            qty: String(qty),
            unit: ing.unit,
            beforeQty: String(currentStock),
            afterQty: String(newStock),
            referenceType: 'recipe',
            referenceId: recipe.id,
            reason: `Recipe consumption: ${recipe.name} x${multiplier}`,
            performedBy: session.actorId,
          })
        }
        return { data: { recipeId: recipe.id, portions: multiplier } }
      })

      // ── Stock Movements Report ──
      .get('/movements', async ({ request }) => {
        const session = (request as any).session
        const url = new URL(request.url)
        const outletId = url.searchParams.get('outletId')
        const from =
          url.searchParams.get('from') ??
          new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
        const to = url.searchParams.get('to') ?? new Date().toISOString().slice(0, 10)
        const movementType = url.searchParams.get('type')
        const where: any[] = [
          eq(rstStockMovements.organizationId, session.orgId),
          gte(rstStockMovements.createdAt, new Date(from + 'T00:00:00Z')),
          lte(rstStockMovements.createdAt, new Date(to + 'T23:59:59Z')),
        ]
        if (outletId) where.push(eq(rstStockMovements.outletId, outletId))
        if (movementType) where.push(eq(rstStockMovements.movementType, movementType))
        const movements = await db.query.rstStockMovements.findMany({
          where: and(...where),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 200,
        })
        return { data: movements }
      })
  )
}
