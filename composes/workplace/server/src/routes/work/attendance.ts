import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq, and, desc, gte, lte } from 'drizzle-orm'
import { workplaceAttendance, workplaceEmployee } from '../../db/schema/workplace'
import { hasPermission, WORKPLACE_ROLES } from '../../permissions/matrix'

export function createAttendanceRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/attendance' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:attendance:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplaceAttendance)
        .where(eq(workplaceAttendance.organizationId, actor.orgId))
        .orderBy(desc(workplaceAttendance.date))
        .limit(500)
      return { attendance: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:attendance:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const records = Array.isArray(body) ? body : [body]
      await db.insert(workplaceAttendance).values(
        records.map((r: any) => ({
          organizationId: actor.orgId,
          employeeId: r.employeeId,
          date: new Date(r.date),
          status: r.status,
          shiftId: r.shiftId,
          checkIn: r.checkIn ? new Date(r.checkIn) : undefined,
          checkOut: r.checkOut ? new Date(r.checkOut) : undefined,
          workHours: r.workHours ? String(r.workHours) : undefined,
          overtimeHours: r.overtimeHours ? String(r.overtimeHours) : '0',
          remarks: r.remarks,
        })),
      )
      return { success: true, count: records.length }
    })
    .post('/mark', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [record] = await db
        .insert(workplaceAttendance)
        .values({
          organizationId: actor.orgId,
          employeeId: body.employeeId,
          date: new Date(body.date),
          status: body.status,
          checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
          checkOut: body.checkOut ? new Date(body.checkOut) : undefined,
          remarks: body.remarks,
        })
        .returning()
      return { attendance: record }
    })
    .get('/monthly', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:attendance:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const query = (ctx as any).query ?? {}
      const month = Number(query.month ?? new Date().getMonth() + 1)
      const year = Number(query.year ?? new Date().getFullYear())
      const employeeId = query.employeeId as string | undefined

      const from = new Date(year, month - 1, 1)
      const to = new Date(year, month, 0)

      const rows = await db
        .select()
        .from(workplaceAttendance)
        .where(
          and(
            eq(workplaceAttendance.organizationId, actor.orgId),
            gte(workplaceAttendance.date, from),
            lte(workplaceAttendance.date, to),
            employeeId ? eq(workplaceAttendance.employeeId, employeeId) : undefined,
          ),
        )
      return { attendance: rows, month, year }
    })
}
