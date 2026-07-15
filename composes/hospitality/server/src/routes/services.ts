import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { hspServiceCatalog, hspServiceRequest } from '../db/schema/hospitality'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createServicesRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/services' })
    .get('/catalog', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'service:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)
      const conds = [
        eq(hspServiceCatalog.organizationId, actor.orgId),
        isNull(hspServiceCatalog.deletedAt),
      ]
      if (q.propertyId) conds.push(eq(hspServiceCatalog.propertyId, String(q.propertyId)))
      if (q.category) conds.push(eq(hspServiceCatalog.category, String(q.category)))

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(hspServiceCatalog)
          .where(and(...conds))
          .orderBy(desc(hspServiceCatalog.name))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(hspServiceCatalog)
          .where(and(...conds)),
      ])
      return listResponse(items, c?.value ?? 0, page, limit)
    })
    .post('/catalog', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'service:catalog:manage')
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [item] = await db
        .insert(hspServiceCatalog)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          ...body,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning()
      ;(ctx as any).set.status = 201
      return item
    })
    .patch('/catalog/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'service:catalog:manage')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [existing] = await db
        .select()
        .from(hspServiceCatalog)
        .where(eq(hspServiceCatalog.id, id))
        .limit(1)
      if (!existing) {
        ;(ctx as any).set.status = 404
        return { error: 'Service not found' }
      }
      const [updated] = await db
        .update(hspServiceCatalog)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(hspServiceCatalog.id, id))
        .returning()
      return updated
    })
    .delete('/catalog/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'service:catalog:manage')
      const { id } = (ctx as any).params
      await db
        .update(hspServiceCatalog)
        .set({ deletedAt: new Date() })
        .where(eq(hspServiceCatalog.id, id))
      return { success: true }
    })
    .get('/requests', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'service:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)
      const conds = [
        eq(hspServiceRequest.organizationId, actor.orgId),
        isNull(hspServiceRequest.deletedAt),
      ]
      if (q.propertyId) conds.push(eq(hspServiceRequest.propertyId, String(q.propertyId)))
      if (q.status) conds.push(eq(hspServiceRequest.status, String(q.status)))
      if (q.reservationId) conds.push(eq(hspServiceRequest.reservationId, String(q.reservationId)))

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(hspServiceRequest)
          .where(and(...conds))
          .orderBy(desc(hspServiceRequest.requestedAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(hspServiceRequest)
          .where(and(...conds)),
      ])
      return listResponse(items, c?.value ?? 0, page, limit)
    })
    .get('/requests/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'service:read')
      const { id } = (ctx as any).params
      const [req] = await db
        .select()
        .from(hspServiceRequest)
        .where(
          and(
            eq(hspServiceRequest.id, id),
            eq(hspServiceRequest.organizationId, actor.orgId),
            isNull(hspServiceRequest.deletedAt),
          ),
        )
        .limit(1)
      if (!req) {
        ;(ctx as any).set.status = 404
        return { error: 'Request not found' }
      }
      return req
    })
    .post('/requests', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'service:create')
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [req] = await db
        .insert(hspServiceRequest)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          ...body,
          requestedAt: now,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .returning()

      // Auto-post to folio if service catalog has autoPostToFolio and a reservation is linked
      if (body.reservationId && body.totalCharge) {
        try {
          await mediator.dispatch({
            type: 'commerce.addLine',
            payload: {
              transactionId: body.folioTransactionId,
              itemId: body.serviceCatalogId,
              description: `Service: ${body.serviceName ?? 'Request'}`,
              qty: body.quantity ?? 1,
              unitPrice: body.totalCharge,
              taxRate: 0,
              meta: { serviceRequestId: req!.id, reservationId: body.reservationId },
            },
            actorId: actor.id,
            orgId: actor.orgId,
            correlationId: crypto.randomUUID(),
          })
        } catch {
          /* commerce module may not be wired */
        }
      }

      ;(ctx as any).set.status = 201
      return req
    })
    .post('/requests/:id/assign', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'service:fulfill')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [updated] = await db
        .update(hspServiceRequest)
        .set({ assignedActorId: body.assignedActorId, status: 'assigned', updatedAt: new Date() })
        .where(eq(hspServiceRequest.id, id))
        .returning()
      return updated
    })
    .post('/requests/:id/complete', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'service:fulfill')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [updated] = await db
        .update(hspServiceRequest)
        .set({
          status: 'completed',
          completedAt: now,
          guestFeedback: body.guestFeedback ?? null,
          guestRating: body.guestRating ?? null,
          updatedAt: now,
        })
        .where(eq(hspServiceRequest.id, id))
        .returning()
      return updated
    })
}
