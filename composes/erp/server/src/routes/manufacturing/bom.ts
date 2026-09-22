import { Elysia } from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and } from 'drizzle-orm'
import { catBomHeaders, catBomLines } from '@db/schema/catalog'
import { hasPermission } from '../../permissions/matrix'

const MAX_BOM_DEPTH = 5

async function explodeBom(bomId: string, multiplier: number, depth: number): Promise<any[]> {
  if (depth > MAX_BOM_DEPTH) return []
  const items = await db.select().from(catBomLines).where(eq(catBomLines.bomId, bomId))
  const result: any[] = []

  for (const item of items) {
    const required = Number(item.qty) * multiplier * (1 + Number(item.scrapPercent ?? 0) / 100)
    result.push({ itemId: item.componentItemId, qty: required, uom: item.uom, depth })
    const [subBom] = await db
      .select()
      .from(catBomHeaders)
      .where(and(eq(catBomHeaders.parentItemId, item.componentItemId), eq(catBomHeaders.isActive, true)))
    if (subBom) {
      const subItems = await explodeBom(subBom.id, required / Number(subBom.yieldQty ?? 1), depth + 1)
      result.push(...subItems)
    }
  }

  return result
}

export function createBomRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/boms' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await mediator.query({
        type: 'catalog.listBoms',
        params: {},
        actorId: actor.actorId,
        orgId: actor.orgId,
      })
      return { boms: rows }
    })

    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:transfer')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const bom = await mediator.dispatch({
        type: 'catalog.createBom',
        payload: {
          parentItemId: body.itemId,
          yieldQty: body.quantity ?? 1,
          uom: body.uom,
          isActive: false,
          meta: { operatingCost: body.operatingCost ?? 0 },
          lines: (body.items ?? []).map((item: any) => ({
            componentItemId: item.itemId,
            qty: item.qty,
            uom: item.uom,
            scrapPercent: item.scrapPct ?? 0,
          })),
        },
        actorId: actor.actorId,
        orgId: actor.orgId,
        correlationId: generateId(),
      })
      ;(ctx as any).set.status = 201
      return { bom }
    })

    .get('/by-item/:itemId', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { itemId } = (ctx as any).params
      const boms = await mediator.query({
        type: 'catalog.listBoms',
        params: { parentItemId: itemId },
        actorId: actor.actorId,
        orgId: actor.orgId,
      })
      return { boms }
    })

    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const bom = await mediator.query({
        type: 'catalog.getBom',
        params: { id },
        actorId: actor.actorId,
        orgId: actor.orgId,
      })
      if (!bom) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      return { bom, items: (bom as any).lines }
    })

    .get('/:id/explode', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const query = (ctx as any).query ?? {}
      const quantity = Number(query.quantity ?? 1)
      const [bom] = await db.select().from(catBomHeaders).where(eq(catBomHeaders.id, id))
      if (!bom) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      const multiplier = quantity / Number(bom.yieldQty ?? 1)
      const materials = await explodeBom(id, multiplier, 1)
      return { materials }
    })

    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:transfer')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await db
        .update(catBomHeaders)
        .set({
          uom: body.uom,
          meta: { operatingCost: body.operatingCost },
          updatedAt: new Date(),
        })
        .where(eq(catBomHeaders.id, id))
      return { success: true }
    })

    .post('/:id/activate', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'erp:inventory:transfer')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await mediator.dispatch({
        type: 'catalog.activateBom',
        payload: { id },
        actorId: actor.actorId,
        orgId: actor.orgId,
        correlationId: generateId(),
      })
      return { success: true }
    })
}
