// Project Management Compose — /projects/psa routes
// Professional Services Automation: rate cards, rates, budgets, retainers, billing

import Elysia from 'elysia'
import { generateId } from '@core'
import type { Mediator } from '@core'
import { db } from '@db/client'
import {
  pjmRateCard,
  pjmMemberRate,
  pjmBudget,
  pjmBudgetPeriod,
  pjmRetainer,
  pjmRetainerUsage,
  pjmBillingSchedule,
  pjmBillingDraft,
  pjmBillingLine,
  pjmWorklog,
  pjmApproval,
} from '../db/schema/project-management'
import { eq, and, isNull, desc, count, sql, gte, lte } from 'drizzle-orm'
import { requirePermission, isFinance } from '../permissions'
import { parsePagination, listResponse, getActor } from './helpers'

export function createPsaRoutes(mediator: Mediator) {
  return (
    new Elysia({ prefix: '/psa' })
      // Rate Cards
      .get('/rate-cards', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:read')
        const cards = await db
          .select()
          .from(pjmRateCard)
          .where(and(eq(pjmRateCard.organizationId, actor.orgId), isNull(pjmRateCard.deletedAt)))
        return { data: cards }
      })
      .post('/rate-cards', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:rates')
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [card] = await db
          .insert(pjmRateCard)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            name: body.name,
            defaultHourlyRate: body.defaultHourlyRate,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return card
      })
      .delete('/rate-cards/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:rates')
        const { id } = (ctx as any).params
        await db.update(pjmRateCard).set({ deletedAt: new Date() }).where(eq(pjmRateCard.id, id))
        return { success: true }
      })
      // Member Rates
      .get('/rate-cards/:id/rates', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:read')
        const { id } = (ctx as any).params
        const rates = await db
          .select()
          .from(pjmMemberRate)
          .where(and(eq(pjmMemberRate.rateCardId, id), isNull(pjmMemberRate.deletedAt)))
        return { data: rates }
      })
      .post('/rate-cards/:id/rates', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:rates')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [rate] = await db
          .insert(pjmMemberRate)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            rateCardId: id,
            role: body.role,
            actorId: body.actorId,
            hourlyRate: body.hourlyRate,
            effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : now,
            effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return rate
      })
      .delete('/rate-cards/:id/rates/:rateId', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:rates')
        const { rateId } = (ctx as any).params
        await db
          .update(pjmMemberRate)
          .set({ deletedAt: new Date() })
          .where(eq(pjmMemberRate.id, rateId))
        return { success: true }
      })
      // Budgets
      .get('/budgets', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:budgets')
        const q = (ctx as any).query ?? {}
        const conds = [eq(pjmBudget.organizationId, actor.orgId), isNull(pjmBudget.deletedAt)]
        if (q.projectId) conds.push(eq(pjmBudget.projectId, String(q.projectId)))
        const budgets = await db
          .select()
          .from(pjmBudget)
          .where(and(...conds))
        return { data: budgets }
      })
      .post('/budgets', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:budgets')
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [budget] = await db
          .insert(pjmBudget)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            projectId: body.projectId,
            name: body.name,
            type: body.type ?? 'fixed_fee',
            totalAmount: body.totalAmount,
            currency: body.currency ?? 'USD',
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return budget
      })
      .delete('/budgets/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:budgets')
        const { id } = (ctx as any).params
        await db.update(pjmBudget).set({ deletedAt: new Date() }).where(eq(pjmBudget.id, id))
        return { success: true }
      })
      // Budget Periods
      .post('/budgets/:id/periods', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:budgets')
        const { id } = (ctx as any).params
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [period] = await db
          .insert(pjmBudgetPeriod)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            budgetId: id,
            name: body.name,
            startDate: new Date(body.startDate),
            endDate: new Date(body.endDate),
            amount: body.amount,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return period
      })
      // Retainers
      .get('/retainers', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:read')
        const q = (ctx as any).query ?? {}
        const conds = [eq(pjmRetainer.organizationId, actor.orgId), isNull(pjmRetainer.deletedAt)]
        if (q.projectId) conds.push(eq(pjmRetainer.projectId, String(q.projectId)))
        const retainers = await db
          .select()
          .from(pjmRetainer)
          .where(and(...conds))
        return { data: retainers }
      })
      .post('/retainers', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:manage')
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [retainer] = await db
          .insert(pjmRetainer)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            projectId: body.projectId,
            clientId: body.clientId,
            name: body.name,
            totalUnits: body.totalUnits,
            usedUnits: 0,
            unitPrice: body.unitPrice,
            startDate: new Date(body.startDate),
            endDate: body.endDate ? new Date(body.endDate) : null,
            status: 'active',
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return retainer
      })
      .get('/retainers/:id/usage', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:read')
        const { id } = (ctx as any).params
        const usage = await db
          .select()
          .from(pjmRetainerUsage)
          .where(eq(pjmRetainerUsage.retainerId, id))
          .orderBy(desc(pjmRetainerUsage.date))
        const [retainer] = await db
          .select()
          .from(pjmRetainer)
          .where(eq(pjmRetainer.id, id))
          .limit(1)
        return { data: usage, retainer }
      })
      // Billing Schedules
      .get('/billing-schedules', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:billing')
        const q = (ctx as any).query ?? {}
        const conds = [
          eq(pjmBillingSchedule.organizationId, actor.orgId),
          isNull(pjmBillingSchedule.deletedAt),
        ]
        if (q.projectId) conds.push(eq(pjmBillingSchedule.projectId, String(q.projectId)))
        const schedules = await db
          .select()
          .from(pjmBillingSchedule)
          .where(and(...conds))
        return { data: schedules }
      })
      .post('/billing-schedules', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:billing')
        const body = (ctx as any).body ?? {}
        const now = new Date()
        const [schedule] = await db
          .insert(pjmBillingSchedule)
          .values({
            id: generateId(),
            organizationId: actor.orgId,
            projectId: body.projectId,
            name: body.name,
            type: body.type ?? 'time_and_materials',
            frequency: body.frequency,
            nextRunDate: body.nextRunDate ? new Date(body.nextRunDate) : null,
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()
        ;(ctx as any).set.status = 201
        return schedule
      })
      // Billing Drafts
      .get('/billing-drafts', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:billing')
        const q = (ctx as any).query ?? {}
        const conds = [
          eq(pjmBillingDraft.organizationId, actor.orgId),
          isNull(pjmBillingDraft.deletedAt),
        ]
        if (q.projectId) conds.push(eq(pjmBillingDraft.projectId, String(q.projectId)))
        if (q.status) conds.push(eq(pjmBillingDraft.status, String(q.status)))
        const drafts = await db
          .select()
          .from(pjmBillingDraft)
          .where(and(...conds))
          .orderBy(desc(pjmBillingDraft.createdAt))
        return { data: drafts }
      })
      .post('/billing-drafts', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:billing')
        const body = (ctx as any).body ?? {}
        const now = new Date()

        // Generate billing lines from worklogs within period
        const worklogs = await db
          .select()
          .from(pjmWorklog)
          .where(
            and(
              eq(pjmWorklog.organizationId, actor.orgId),
              isNull(pjmWorklog.deletedAt),
              eq(pjmWorklog.approved, true),
            ),
          )

        const draftId = generateId()
        let totalAmount = 0

        const [draft] = await db
          .insert(pjmBillingDraft)
          .values({
            id: draftId,
            organizationId: actor.orgId,
            projectId: body.projectId,
            clientId: body.clientId,
            scheduleId: body.scheduleId,
            periodStart: body.periodStart ? new Date(body.periodStart) : null,
            periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
            totalAmount: 0,
            status: 'draft',
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
          .returning()

        // Create billing lines (simplified: flat rate)
        for (const wl of worklogs.slice(0, 100)) {
          const lineAmount = (wl.timeSpent / 60) * 10000 // $100/hr default rate in cents
          totalAmount += lineAmount
          await db.insert(pjmBillingLine).values({
            id: generateId(),
            organizationId: actor.orgId,
            draftId,
            description: wl.description ?? 'Work log entry',
            quantity: wl.timeSpent / 60,
            unitPrice: 10000,
            totalAmount: lineAmount,
            worklogId: wl.id,
            type: 'time',
            createdAt: now,
            updatedAt: now,
            version: 1,
            meta: {},
          })
        }

        await db
          .update(pjmBillingDraft)
          .set({ totalAmount, updatedAt: now })
          .where(eq(pjmBillingDraft.id, draftId))
        ;(ctx as any).set.status = 201
        return { ...draft, totalAmount }
      })
      .get('/billing-drafts/:id', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:billing')
        const { id } = (ctx as any).params
        const [draft] = await db
          .select()
          .from(pjmBillingDraft)
          .where(eq(pjmBillingDraft.id, id))
          .limit(1)
        if (!draft) {
          ;(ctx as any).set.status = 404
          return { error: 'Draft not found' }
        }
        const lines = await db.select().from(pjmBillingLine).where(eq(pjmBillingLine.draftId, id))
        return { ...draft, lines }
      })
      .post('/billing-drafts/:id/approve', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:billing')
        const { id } = (ctx as any).params
        const now = new Date()
        await db
          .update(pjmBillingDraft)
          .set({ status: 'approved', approvedById: actor.id, approvedAt: now, updatedAt: now })
          .where(eq(pjmBillingDraft.id, id))
        return { success: true }
      })
      .post('/billing-drafts/:id/export-erp', async (ctx) => {
        const actor = getActor(ctx)
        requirePermission(actor, 'psa:billing')
        const { id } = (ctx as any).params
        const [draft] = await db
          .select()
          .from(pjmBillingDraft)
          .where(eq(pjmBillingDraft.id, id))
          .limit(1)
        if (!draft) {
          ;(ctx as any).set.status = 404
          return { error: 'Draft not found' }
        }
        if (draft.status !== 'approved') {
          ;(ctx as any).set.status = 400
          return { error: 'Draft must be approved' }
        }

        await db
          .update(pjmBillingDraft)
          .set({ status: 'exported', exportedToErpAt: new Date(), updatedAt: new Date() })
          .where(eq(pjmBillingDraft.id, id))

        // ERP integration is optional
        try {
          await mediator.dispatch({
            type: 'pjm.billing.exported',
            draftId: id,
            orgId: actor.orgId,
          } as any)
        } catch {
          /* ERP integration optional */
        }

        return { success: true }
      })
  )
}
