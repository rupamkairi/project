import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, createDomainEvent, NotFoundError } from '@core'
import { db } from '@db/client'
import { catCategories, catItems, catVariants } from '@db/schema/catalog'
import {
  rstMenuPeriods,
  rstModifiers,
  rstModifierGroups,
} from '../db/schema/restaurant.js'
import { eq, and, asc, isNull } from 'drizzle-orm'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function mapCategory(c: typeof catCategories.$inferSelect) {
  const meta = (c.meta ?? {}) as Record<string, any>
  return {
    id: c.id,
    organizationId: c.organizationId,
    name: c.name,
    description: meta.description ?? null,
    sortOrder: c.sortOrder,
    parentId: c.parentId,
    isActive: c.status === 'active',
    mealPeriod: meta.mealPeriod ?? 'all',
    imageUrl: meta.imageUrl ?? null,
    outletId: meta.outletId ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

function mapVariant(v: typeof catVariants.$inferSelect) {
  const attributes = (v.attributes ?? {}) as Record<string, any>
  return {
    id: v.id,
    organizationId: v.organizationId,
    itemId: v.itemId,
    name: attributes.name,
    priceAdjustment: attributes.priceAdjustment ?? '0',
    isDefault: attributes.isDefault ?? false,
    isActive: v.status === 'active',
    sortOrder: attributes.sortOrder ?? 0,
  }
}

export function createMenuRoutes(mediator: Mediator, bus: EventBus) {
  return (
    new Elysia({ prefix: '/menu' })
      // ── Categories ──
      .get('/categories', async ({ request }) => {
        const session = (request as any).session
        const cats = await db
          .select()
          .from(catCategories)
          .where(
            and(
              eq(catCategories.organizationId, session.orgId),
              eq(catCategories.status, 'active'),
              isNull(catCategories.deletedAt),
            ),
          )
          .orderBy(asc(catCategories.sortOrder))
        return { data: cats.map(mapCategory) }
      })

      .post('/categories', async ({ body, request }) => {
        const session = (request as any).session
        const input = body as any
        const catId = generateId()
        const [cat] = await db
          .insert(catCategories)
          .values({
            id: catId,
            organizationId: session.orgId,
            name: input.name,
            slug: slugify(input.name) + '-' + catId.slice(-6),
            parentId: input.parentId ?? null,
            sortOrder: input.sortOrder ?? 0,
            status: 'active',
            meta: {
              mealPeriod: input.mealPeriod ?? 'all',
              outletId: input.outletId ?? null,
              imageUrl: input.imageUrl ?? null,
              description: input.description ?? null,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          })
          .returning()
        return { data: mapCategory(cat!) }
      })

      .patch('/categories/:id', async ({ params, body, request }) => {
        const input = body as any
        const [existing] = await db
          .select()
          .from(catCategories)
          .where(eq(catCategories.id, params.id))
          .limit(1)
        if (!existing) throw new NotFoundError('Category not found')

        const existingMeta = (existing.meta ?? {}) as Record<string, any>
        const nextMeta = {
          ...existingMeta,
          description: input.description ?? existingMeta.description ?? null,
          mealPeriod: input.mealPeriod ?? existingMeta.mealPeriod ?? 'all',
          imageUrl: input.imageUrl ?? existingMeta.imageUrl ?? null,
          outletId: input.outletId ?? existingMeta.outletId ?? null,
        }

        const [updated] = await db
          .update(catCategories)
          .set({
            name: input.name ?? existing.name,
            slug: input.name ? slugify(input.name) + '-' + existing.id.slice(-6) : existing.slug,
            sortOrder: input.sortOrder ?? existing.sortOrder,
            parentId: input.parentId !== undefined ? input.parentId : existing.parentId,
            status:
              input.isActive === undefined
                ? existing.status
                : input.isActive
                  ? 'active'
                  : 'inactive',
            meta: nextMeta,
            updatedAt: new Date(),
          })
          .where(eq(catCategories.id, params.id))
          .returning()
        return { data: mapCategory(updated!) }
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
        const outletId = url.searchParams.get('outletId')
        const items = await mediator.query({
          type: 'catalog.listItems',
          params: { orgId: session.orgId, type: 'menu_item', outletId },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        const enriched = await Promise.all(
          (items as any[]).map(async (item) => {
            const variants = await db
              .select()
              .from(catVariants)
              .where(
                and(
                  eq(catVariants.itemId, item.id),
                  eq(catVariants.status, 'active'),
                  isNull(catVariants.deletedAt),
                ),
              )
            const allergens = item.meta?.allergens ?? []
            return { ...item, variants: variants.map(mapVariant), allergens }
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
              allergens: input.allergens ?? [],
            },
          },
          actorId: session.actorId,
          orgId: session.orgId,
          correlationId: generateId(),
        })
        const newItem = item as any
        if (input.variants?.length) {
          for (const v of input.variants) {
            await db.insert(catVariants).values({
              id: generateId(),
              organizationId: session.orgId,
              itemId: newItem.id,
              sku: `${newItem.id}-${slugify(v.name)}`,
              attributes: {
                name: v.name,
                priceAdjustment: v.priceAdjustment ?? '0',
                isDefault: v.isDefault ?? false,
                sortOrder: v.sortOrder ?? 0,
              },
              stockTracked: false,
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
              version: 1,
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
          .insert(catVariants)
          .values({
            id: generateId(),
            organizationId: session.orgId,
            itemId: params.id,
            sku: `${params.id}-${slugify(input.name)}`,
            attributes: {
              name: input.name,
              priceAdjustment: input.priceAdjustment ?? '0',
              isDefault: input.isDefault ?? false,
              sortOrder: input.sortOrder ?? 0,
            },
            stockTracked: false,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          })
          .returning()
        return { data: mapVariant(variant!) }
      })

      .patch('/variants/:id', async ({ params, body, request }) => {
        const input = body as any
        const [existing] = await db
          .select()
          .from(catVariants)
          .where(eq(catVariants.id, params.id))
          .limit(1)
        if (!existing) throw new NotFoundError('Variant not found')

        const attributes = (existing.attributes ?? {}) as Record<string, any>
        const nextAttributes = {
          name: input.name ?? attributes.name,
          priceAdjustment: input.priceAdjustment ?? attributes.priceAdjustment ?? '0',
          isDefault: input.isDefault ?? attributes.isDefault ?? false,
          sortOrder: input.sortOrder ?? attributes.sortOrder ?? 0,
        }

        const [updated] = await db
          .update(catVariants)
          .set({
            attributes: nextAttributes,
            status:
              input.isActive === undefined
                ? existing.status
                : input.isActive
                  ? 'active'
                  : 'inactive',
            updatedAt: new Date(),
          })
          .where(eq(catVariants.id, params.id))
          .returning()
        return { data: mapVariant(updated!) }
      })

      // ── Allergens ──
      .post('/items/:id/allergens', async ({ params, body, request }) => {
        const session = (request as any).session
        const input = body as any
        const [item] = await db
          .select()
          .from(catItems)
          .where(eq(catItems.id, params.id))
          .limit(1)
        if (!item) throw new NotFoundError('Menu item not found')

        const existingMeta = (item.meta ?? {}) as Record<string, any>
        const allergens = Array.isArray(existingMeta.allergens) ? [...existingMeta.allergens] : []
        const newAllergen = { allergen: input.allergen, severity: input.severity ?? 'contains' }
        allergens.push(newAllergen)
        await db
          .update(catItems)
          .set({ meta: { ...existingMeta, allergens }, updatedAt: new Date() })
          .where(eq(catItems.id, params.id))
        return { data: { itemId: params.id, ...newAllergen } }
      })

      // ── Modifiers ──
      .get('/modifiers', async ({ request }) => {
        const session = (request as any).session
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
