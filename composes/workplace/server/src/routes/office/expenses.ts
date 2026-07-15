import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import { workplaceExpenseClaim, workplaceExpenseItem } from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createExpenseRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/expenses' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:expenses:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceExpenseClaim)
        .where(eq(workplaceExpenseClaim.organizationId, actor.orgId))
        .orderBy(desc(workplaceExpenseClaim.createdAt))
        .limit(100)
      return { expenseClaims: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const totalAmount = (body.items ?? []).reduce(
        (sum: number, item: any) => sum + Number(item.amount ?? 0),
        0,
      )

      const [claim] = await db
        .insert(workplaceExpenseClaim)
        .values({
          organizationId: actor.orgId,
          employeeId: body.employeeId,
          title: body.title,
          description: body.description,
          category: body.category,
          totalAmount: String(totalAmount),
          currency: body.currency ?? 'INR',
          status: 'draft',
        })
        .returning()

      if (!claim) {
        ;(ctx as any).set.status = 500
        return { error: 'Expense claim was not created' }
      }

      if (body.items?.length) {
        await db.insert(workplaceExpenseItem).values(
          body.items.map((item: any) => ({
            claimId: claim.id,
            date: new Date(item.date),
            description: item.description,
            category: item.category,
            amount: String(item.amount),
            currency: item.currency ?? 'INR',
            documentId: item.documentId,
            billable: item.billable ?? false,
          })),
        )
      }

      ;(ctx as any).set.status = 201
      return { expenseClaim: claim }
    })
    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:expenses:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const [claim] = await db
        .select()
        .from(workplaceExpenseClaim)
        .where(eq(workplaceExpenseClaim.id, id))
      if (!claim) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      const items = await db
        .select()
        .from(workplaceExpenseItem)
        .where(eq(workplaceExpenseItem.claimId, id))
      return { expenseClaim: claim, items }
    })
    .post('/:id/submit', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await db
        .update(workplaceExpenseClaim)
        .set({
          status: 'submitted',
          submittedAt: new Date(),
        })
        .where(eq(workplaceExpenseClaim.id, id))
      return { success: true }
    })
    .post('/:id/approve', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:expenses:approve')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await db
        .update(workplaceExpenseClaim)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          approvedById: actor.actorId,
        })
        .where(eq(workplaceExpenseClaim.id, id))
      return { success: true }
    })
    .post('/:id/reject', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:expenses:approve')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await db
        .update(workplaceExpenseClaim)
        .set({
          status: 'rejected',
          rejectedReason: body.reason,
        })
        .where(eq(workplaceExpenseClaim.id, id))
      return { success: true }
    })
}
