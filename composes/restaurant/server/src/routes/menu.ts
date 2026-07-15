import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, createDomainEvent, NotFoundError } from '@core'
import { db } from '../lib/db.js'
import {
  rstCategories,
  rstMenuPeriods,
  rstItemVariants,
  rstItemAllergens,
  rstModifiers,
  rstModifierGroups,
} from '../db/schema/restaurant.js'
import { eq, and } from 'drizzle-orm'

export function createMenuRoutes(mediator: Mediator, bus: EventBus) {
  return (
    new Elysia({ prefix: '/menu' })
      // ── Categories ──
      .get('/categories', async ({ request }) => {
        const session = (request as any).session
        const outletId = new URL(request.url).searchParams.get('outletId')
        const cats = await db.query.rstCategories.findMany({
          where: and(
            eq(rstCategories.organizationId, session.orgId),
            eq(rstCategories.isActive, true),
          ),
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
        })
        return { data: cats }
      })

      .post('/categories', async ({ body, request }) => {
        const session = (request as any).session
        const input = body as any
        const [cat] = await db
          .insert(rstCategories)
          .values({
            id: generateId(),
            organizationId: session.orgId,
            name: input.name,
            description: input.description,
            sortOrder: input.sortOrder ?? 0,
            parentId: input.parentId,
            mealPeriod: input.mealPeriod ?? 'all',
            imageUrl: input.imageUrl,
            outletId: input.outletId,
          })
          .returning()
        return { data: cat }
      })

      .patch('/categories/:id', async ({ params, body, request }) => {
        const [updated] = await db
          .update(rstCategories)
          .set({ ...(body as any), updatedAt: new Date() })
          .where(eq(rstCategories.id, params.id))
          .returning()
        return { data: updated }
      })

      // ── Menu Periods ──
      .get('/periods', async ({ request }) => {
        const session = (request as any).session
        const outletId = new URL(request.url).searchParams.get('outletId')
        const periods = await db.query.rstMenuPeriods.findMany({
          where: and(
            eq(rstMenuPeriods.organizationId, session.orgId),
            outletId ? eq(rstMenuPeriods.outletId, outletId) : undefined,
            eq(rstMenuPeriods.isActive, true),
          ),
        })
        return { data: periods }
      })

      .post('/periods', async ({ body, request }) => {
        const session = (request as any).session
        const input = body as any
        const [period] = await db
          .insert(rstMenuPeriods)
          .values({
            id: generateId(),
            organizationId: session.orgId,
            outletId: input.outletId,
            name: input.name,
            startTime: input.startTime,
            endTime: input.endTime,
            daysOfWeek: input.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
          })
          .returning()
        return { data: period }
      })

      // ── Items ──
      .get('/items', async ({ request }) => {
        const session = (request as any).session
        const url = new URL(request.url)
        const categoryId = url.searchParams.get('categoryId')
        const outletId = url.searchParams.get('outletId')
        const items = await mediator.query({
          type: 'catalog.listItems',
          params: { orgId: session.orgId, type: 'menu_item', outletId },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        const enriched = await Promise.all(
          (items as any[]).map(async (item) => {
            const variants = await db.query.rstItemVariants.findMany({
              where: and(eq(rstItemVariants.itemId, item.id), eq(rstItemVariants.isActive, true)),
            })
            const allergens = await db.query.rstItemAllergens.findMany({
              where: eq(rstItemAllergens.itemId, item.id),
            })
            return { ...item, variants, allergens }
          }),
        )
        return { data: enriched }
      })

      .post('/items', async ({ body, request }) => {
        const session = (request as any).session
        const input = body as any
        const item = await mediator.dispatch({
          type: 'catalog.createItem',
          payload: {
            type: 'menu_item',
            name: input.name,
            description: input.description,
            meta: {
              basePrice: input.basePrice,
              categoryId: input.categoryId,
              station: input.station,
              isAvailable: true,
              isPopular: false,
              outletId: input.outletId,
              foodType: input.foodType,
              dietaryTags: input.dietaryTags ?? [],
              preparationTimeMinutes: input.preparationTimeMinutes,
              taxPct: input.taxPct,
              thumbnailUrl: input.thumbnailUrl,
              sortOrder: input.sortOrder ?? 0,
            },
          },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })
        const newItem = item as any
        if (input.variants?.length) {
          for (const v of input.variants) {
            await db.insert(rstItemVariants).values({
              id: generateId(),
              organizationId: session.orgId,
              itemId: newItem.id,
              name: v.name,
              priceAdjustment: v.priceAdjustment ?? '0',
              isDefault: v.isDefault ?? false,
              sortOrder: v.sortOrder ?? 0,
            })
          }
        }
        if (input.allergens?.length) {
          for (const a of input.allergens) {
            await db.insert(rstItemAllergens).values({
              id: generateId(),
              organizationId: session.orgId,
              itemId: newItem.id,
              allergen: a.allergen,
              severity: a.severity ?? 'contains',
            })
          }
        }
        return { data: newItem }
      })

      .patch('/items/:id', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const item = await mediator.dispatch({
          type: 'catalog.updateItem',
          payload: { itemId: params.id, ...input },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })
        return { data: item }
      })

      .post('/items/:id/toggle-86', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const item = await mediator.dispatch({
          type: 'catalog.updateItem',
          payload: { itemId: params.id, meta: { isAvailable: input.available } },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })
        await bus.publish(
          createDomainEvent(
            'rst.menu.item-86d',
            params.id,
            'rst.menu-item',
            { menuItemId: params.id, available: input.available, orgId: session.orgId },
            session.orgId,
          ),
        )
        return { data: item }
      })

      // ── Variants ──
      .post('/items/:id/variants', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const [variant] = await db
          .insert(rstItemVariants)
          .values({
            id: generateId(),
            organizationId: session.orgId,
            itemId: params.id,
            name: input.name,
            priceAdjustment: input.priceAdjustment ?? '0',
            isDefault: input.isDefault ?? false,
            sortOrder: input.sortOrder ?? 0,
          })
          .returning()
        return { data: variant }
      })

      .patch('/variants/:id', async ({ params, body, request }) => {
        const [updated] = await db
          .update(rstItemVariants)
          .set({ ...(body as any) })
          .where(eq(rstItemVariants.id, params.id))
          .returning()
        return { data: updated }
      })

      // ── Allergens ──
      .post('/items/:id/allergens', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const [allergen] = await db
          .insert(rstItemAllergens)
          .values({
            id: generateId(),
            organizationId: session.orgId,
            itemId: params.id,
            allergen: input.allergen,
            severity: input.severity ?? 'contains',
          })
          .returning()
        return { data: allergen }
      })

      // ── Modifiers ──
      .get('/modifiers', async ({ request }) => {
        const session = (request as any).session
        const outletId = new URL(request.url).searchParams.get('outletId')
        const modifiers = await db.query.rstModifiers.findMany({
          where: and(
            eq(rstModifiers.organizationId, session.orgId),
            eq(rstModifiers.isActive, true),
          ),
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
        })
        return { data: modifiers }
      })

      .post('/modifiers', async ({ body, request }) => {
        const session = (request as any).session
        const input = body as any
        const [modifier] = await db
          .insert(rstModifiers)
          .values({
            id: generateId(),
            organizationId: session.orgId,
            name: input.name,
            priceAdjustment: input.priceAdjustment ?? '0',
            sortOrder: input.sortOrder ?? 0,
          })
          .returning()
        return { data: modifier }
      })

      // ── Modifier Groups ──
      .get('/modifier-groups', async ({ request }) => {
        const session = (request as any).session
        const outletId = new URL(request.url).searchParams.get('outletId')
        const groups = await db.query.rstModifierGroups.findMany({
          where: and(
            eq(rstModifierGroups.organizationId, session.orgId),
            eq(rstModifierGroups.isActive, true),
          ),
        })
        return { data: groups }
      })

      .post('/modifier-groups', async ({ body, request }) => {
        const session = (request as any).session
        const input = body as any
        const [group] = await db
          .insert(rstModifierGroups)
          .values({
            id: generateId(),
            organizationId: session.orgId,
            name: input.name,
            selectionType: input.selectionType,
            minSelections: input.minSelections ?? 0,
            maxSelections: input.maxSelections ?? 1,
            required: input.required ?? false,
            itemIds: input.itemIds ?? [],
            modifierIds: input.modifierIds ?? [],
            outletId: input.outletId,
          })
          .returning()
        return { data: group }
      })
  )
}
