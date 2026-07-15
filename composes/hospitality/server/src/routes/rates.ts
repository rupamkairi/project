import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { hspRatePlan, hspRateOverride } from '../db/schema/hospitality'
import { eq, and, isNull, desc, count, gte, lte } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createRatesRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/rates' })
    .get('/plans', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'rate:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)
      const conds = [eq(hspRatePlan.organizationId, actor.orgId), isNull(hspRatePlan.deletedAt)]
      if (q.propertyId) conds.push(eq(hspRatePlan.propertyId, String(q.propertyId)))
      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(hspRatePlan)
          .where(and(...conds))
          .orderBy(desc(hspRatePlan.name))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(hspRatePlan)
          .where(and(...conds)),
      ])
      return listResponse(items, c?.value ?? 0, page, limit)
    })
    .post('/plans', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'rate:create')
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [plan] = await db
        .insert(hspRatePlan)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          propertyId: body.propertyId,
          name: body.name,
          code: body.code,
          isActive: body.isActive ?? true,
          minStay: body.minStay ?? 1,
          maxStay: body.maxStay ?? null,
          minGuests: body.minGuests ?? 1,
          maxGuests: body.maxGuests ?? 1,
          maxAdults: body.maxAdults ?? 2,
          maxChildren: body.maxChildren ?? 0,
          mealPlan: body.mealPlan ?? null,
          extraPersonCharge: body.extraPersonCharge ?? null,
          extraChildCharge: body.extraChildCharge ?? null,
          cancellationPolicy: body.cancellationPolicy ?? null,
          terms: body.terms ?? null,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: body.meta ?? {},
        })
        .returning()
      ;(ctx as any).set.status = 201
      return plan
    })
    .patch('/plans/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'rate:update')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [existing] = await db.select().from(hspRatePlan).where(eq(hspRatePlan.id, id)).limit(1)
      if (!existing) {
        ;(ctx as any).set.status = 404
        return { error: 'Rate plan not found' }
      }
      const [updated] = await db
        .update(hspRatePlan)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(hspRatePlan.id, id))
        .returning()
      return updated
    })
    .delete('/plans/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'rate:delete')
      const { id } = (ctx as any).params
      await db.update(hspRatePlan).set({ deletedAt: new Date() }).where(eq(hspRatePlan.id, id))
      return { success: true }
    })
    .get('/overrides', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'rate:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)
      const conds = [
        eq(hspRateOverride.organizationId, actor.orgId),
        isNull(hspRateOverride.deletedAt),
      ]
      if (q.ratePlanId) conds.push(eq(hspRateOverride.ratePlanId, String(q.ratePlanId)))
      if (q.fromDate && q.toDate)
        conds.push(
          gte(hspRateOverride.date, String(q.fromDate)),
          lte(hspRateOverride.date, String(q.toDate)),
        )
      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(hspRateOverride)
          .where(and(...conds))
          .orderBy(desc(hspRateOverride.date))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(hspRateOverride)
          .where(and(...conds)),
      ])
      return listResponse(items, c?.value ?? 0, page, limit)
    })
    .post('/overrides', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'rate:create')
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [ov] = await db
        .insert(hspRateOverride)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          ...body,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: body.meta ?? {},
        })
        .returning()
      ;(ctx as any).set.status = 201
      return ov
    })
    .patch('/overrides/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'rate:update')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [existing] = await db
        .select()
        .from(hspRateOverride)
        .where(eq(hspRateOverride.id, id))
        .limit(1)
      if (!existing) {
        ;(ctx as any).set.status = 404
        return { error: 'Override not found' }
      }
      const [updated] = await db
        .update(hspRateOverride)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(hspRateOverride.id, id))
        .returning()
      return updated
    })
    .delete('/overrides/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'rate:delete')
      const { id } = (ctx as any).params
      await db
        .update(hspRateOverride)
        .set({ deletedAt: new Date() })
        .where(eq(hspRateOverride.id, id))
      return { success: true }
    })
}
