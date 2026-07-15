import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import {
  workplacePayComponent,
  workplaceSalaryStructure,
  workplaceEmployeeCompensation,
} from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createCompensationRoutes(mediator: Mediator) {
  return new Elysia()
    .get('/pay-components', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:compensation:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplacePayComponent)
        .where(eq(workplacePayComponent.organizationId, actor.orgId))
      return { payComponents: rows }
    })
    .get('/salary-structures', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:compensation:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceSalaryStructure)
        .where(eq(workplaceSalaryStructure.organizationId, actor.orgId))
      return { salaryStructures: rows }
    })
    .post('/salary-structures', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:compensation:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [structure] = await db
        .insert(workplaceSalaryStructure)
        .values({
          organizationId: actor.orgId,
          name: body.name,
          isDefault: body.isDefault ?? false,
          components: body.components,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { salaryStructure: structure }
    })
    .get('/compensations', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:compensation:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { employeeId } = (ctx as any).query ?? {}
      const rows = await db
        .select()
        .from(workplaceEmployeeCompensation)
        .where(
          and(
            eq(workplaceEmployeeCompensation.organizationId, actor.orgId),
            employeeId ? eq(workplaceEmployeeCompensation.employeeId, employeeId) : undefined,
            eq(workplaceEmployeeCompensation.active, true),
          ),
        )
      return { compensations: rows }
    })
    .post('/compensations', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:compensation:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any

      // Deactivate existing compensation
      if (body.employeeId) {
        await db
          .update(workplaceEmployeeCompensation)
          .set({ active: false, effectiveTo: new Date() })
          .where(
            and(
              eq(workplaceEmployeeCompensation.employeeId, body.employeeId),
              eq(workplaceEmployeeCompensation.active, true),
            ),
          )
      }

      const [comp] = await db
        .insert(workplaceEmployeeCompensation)
        .values({
          organizationId: actor.orgId,
          employeeId: body.employeeId,
          structureId: body.structureId,
          ctc: body.ctc,
          effectiveFrom: new Date(body.effectiveFrom),
          bankAccount: body.bankAccount,
          bankName: body.bankName,
          bankIfsc: body.bankIfsc,
          pan: body.pan,
          pfNo: body.pfNo,
          esiNo: body.esiNo,
          uan: body.uan,
          active: true,
          updatedById: actor.actorId,
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { compensation: comp }
    })
}
