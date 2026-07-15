// Project Management Compose — /projects/portfolios routes

import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { pjmPortfolio, pjmPortfolioMember } from '../db/schema/project-management'
import { eq, and, isNull, desc, ilike, or, count } from 'drizzle-orm'
import { requirePermission, isManager } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createPortfolioRoutes(_mediator: Mediator) {
  return new Elysia({ prefix: '/portfolios' })
    .get('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'portfolio:read')
      const q = (ctx as any).query ?? {}
      const { page, limit, offset } = parsePagination(q)

      const conds = [eq(pjmPortfolio.organizationId, actor.orgId), isNull(pjmPortfolio.deletedAt)]
      if (q.search) {
        conds.push(or(ilike(pjmPortfolio.name, `%${q.search}%`))!)
      }
      if (q.status) conds.push(eq(pjmPortfolio.status, String(q.status)))

      const [items, [c]] = await Promise.all([
        db
          .select()
          .from(pjmPortfolio)
          .where(and(...conds))
          .orderBy(desc(pjmPortfolio.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ value: count() })
          .from(pjmPortfolio)
          .where(and(...conds)),
      ])

      return listResponse(items, c?.value ?? 0, page, limit)
    })
    .get('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'portfolio:read')
      const { id } = (ctx as any).params
      const [portfolio] = await db
        .select()
        .from(pjmPortfolio)
        .where(
          and(
            eq(pjmPortfolio.id, id),
            eq(pjmPortfolio.organizationId, actor.orgId),
            isNull(pjmPortfolio.deletedAt),
          ),
        )
        .limit(1)
      if (!portfolio) {
        ;(ctx as any).set.status = 404
        return { error: 'Portfolio not found' }
      }
      return portfolio
    })
    .post('/', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'portfolio:create')
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [portfolio] = await db
        .insert(pjmPortfolio)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          name: body.name,
          description: body.description,
          status: body.status ?? 'active',
          ownerId: body.ownerId ?? actor.id,
          startDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: body.meta ?? {},
        })
        .returning()
      ;(ctx as any).set.status = 201
      return portfolio
    })
    .patch('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'portfolio:update')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const [updated] = await db
        .update(pjmPortfolio)
        .set({
          ...(body.name != null && { name: body.name }),
          ...(body.description != null && { description: body.description }),
          ...(body.status != null && { status: body.status }),
          ...(body.ownerId != null && { ownerId: body.ownerId }),
          ...(body.startDate != null && { startDate: new Date(body.startDate) }),
          ...(body.endDate != null && { endDate: new Date(body.endDate) }),
          updatedAt: new Date(),
        })
        .where(eq(pjmPortfolio.id, id))
        .returning()
      return updated
    })
    .delete('/:id', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'portfolio:delete')
      const { id } = (ctx as any).params
      await db.update(pjmPortfolio).set({ deletedAt: new Date() }).where(eq(pjmPortfolio.id, id))
      return { success: true }
    })
    .get('/:id/members', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'portfolio:read')
      const { id } = (ctx as any).params
      const members = await db
        .select()
        .from(pjmPortfolioMember)
        .where(
          and(
            eq(pjmPortfolioMember.portfolioId, id),
            eq(pjmPortfolioMember.organizationId, actor.orgId),
            isNull(pjmPortfolioMember.deletedAt),
          ),
        )
      return { data: members }
    })
    .post('/:id/members', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'portfolio:update')
      const { id } = (ctx as any).params
      const body = (ctx as any).body ?? {}
      const now = new Date()
      const [member] = await db
        .insert(pjmPortfolioMember)
        .values({
          id: generateId(),
          organizationId: actor.orgId,
          portfolioId: id,
          actorId: body.actorId,
          role: body.role ?? 'viewer',
          createdAt: now,
          updatedAt: now,
          version: 1,
          meta: {},
        })
        .onConflictDoNothing()
        .returning()
      ;(ctx as any).set.status = 201
      return member
    })
    .delete('/:id/members/:actorId', async (ctx) => {
      const actor = getActor(ctx)
      requirePermission(actor, 'portfolio:update')
      const { id, actorId } = (ctx as any).params
      await db
        .delete(pjmPortfolioMember)
        .where(and(eq(pjmPortfolioMember.portfolioId, id), eq(pjmPortfolioMember.actorId, actorId)))
      return { success: true }
    })
}
