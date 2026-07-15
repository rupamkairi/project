import Elysia from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, NotFoundError } from '@core'
import { db } from '../lib/db.js'
import { rstStaff, rstShiftAssignments, rstShifts } from '../db/schema/restaurant.js'
import { and, eq, gte, lte } from 'drizzle-orm'

export function createStaffRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: '/staff' })
    .get('/', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const outletId = url.searchParams.get('outletId')
      const role = url.searchParams.get('role')
      const where: any[] = [eq(rstStaff.organizationId, session.orgId), eq(rstStaff.isActive, true)]
      if (outletId) where.push(eq(rstStaff.outletId, outletId))
      const staff = await db.query.rstStaff.findMany({
        where: and(...where),
        orderBy: (t, { asc }) => [asc(t.employeeCode)],
      })
      const enriched = await Promise.all(
        staff.map(async (s) => {
          const person = (await mediator
            .query({
              type: 'identity.getPerson',
              params: { personId: s.personId },
              actorId: session.actorId,
              orgId: session.orgId,
            })
            .catch(() => null)) as any
          return {
            ...s,
            firstName: person?.firstName,
            lastName: person?.lastName,
            email: person?.email,
            phone: person?.phone,
          }
        }),
      )
      return { data: enriched }
    })

    .get('/:id', async ({ params, request }) => {
      const session = (request as any).session
      const staff = await db.query.rstStaff.findFirst({
        where: and(eq(rstStaff.id, params.id), eq(rstStaff.organizationId, session.orgId)),
      })
      if (!staff) throw new NotFoundError('Staff record not found')
      const person = (await mediator
        .query({
          type: 'identity.getPerson',
          params: { personId: staff.personId },
          actorId: session.actorId,
          orgId: session.orgId,
        })
        .catch(() => null)) as any
      return { data: { ...staff, firstName: person?.firstName, lastName: person?.lastName } }
    })

    .post('/', async ({ body, request }) => {
      const session = (request as any).session
      const input = body as any
      const [record] = await db
        .insert(rstStaff)
        .values({
          id: generateId(),
          organizationId: session.orgId,
          personId: input.personId,
          employeeCode: input.employeeCode ?? `EMP-${Date.now().toString(36).toUpperCase()}`,
          outletId: input.outletId,
          operationalRoles: input.operationalRoles ?? [],
          hireDate: input.hireDate,
          hourlyRate: input.hourlyRate,
          bankAccount: input.bankAccount,
          emergencyContact: input.emergencyContact,
          isActive: true,
        })
        .returning()
      return { data: record }
    })

    .patch('/:id', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      const [updated] = await db
        .update(rstStaff)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(rstStaff.id, params.id))
        .returning()
      return { data: updated }
    })

    .get('/:id/attendance', async ({ request, params }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const from = url.searchParams.get('from') ?? new Date().toISOString().slice(0, 7) + '-01'
      const to = url.searchParams.get('to') ?? new Date().toISOString().slice(0, 10)
      const assignments = await db.query.rstShiftAssignments.findMany({
        where: and(
          eq(rstShiftAssignments.organizationId, session.orgId),
          eq(rstShiftAssignments.personId, params.id),
        ),
        with: { shift: true },
        orderBy: (t, { desc }) => [desc(t.clockIn)],
      })
      const filtered = assignments.filter((a) => {
        if (!a.clockIn) return false
        const d = new Date(a.clockIn).toISOString().slice(0, 10)
        return d >= from && d <= to
      })
      return { data: filtered }
    })

    .post('/:id/clock-in', async ({ params, body, request }) => {
      const session = (request as any).session
      const input = body as any
      const [assignment] = await db
        .insert(rstShiftAssignments)
        .values({
          id: generateId(),
          organizationId: session.orgId,
          shiftId: input.shiftId,
          personId: params.id,
          role: input.role,
          clockIn: new Date(),
        })
        .returning()
      return { data: assignment }
    })

    .post('/:id/clock-out', async ({ params, request }) => {
      const session = (request as any).session
      const latest = await db.query.rstShiftAssignments.findFirst({
        where: and(
          eq(rstShiftAssignments.organizationId, session.orgId),
          eq(rstShiftAssignments.personId, params.id),
        ),
        orderBy: (t, { desc }) => [desc(t.clockIn)],
      })
      if (!latest) throw new NotFoundError('No active shift assignment found')
      const clockOut = new Date()
      const totalMs = clockOut.getTime() - new Date(latest.clockIn!).getTime()
      const totalHours = Math.round((totalMs / 3600000) * 100) / 100
      const [updated] = await db
        .update(rstShiftAssignments)
        .set({ clockOut, totalHours: String(totalHours) })
        .where(eq(rstShiftAssignments.id, latest.id))
        .returning()
      return { data: updated }
    })

    .get('/shifts/summary', async ({ request }) => {
      const session = (request as any).session
      const url = new URL(request.url)
      const outletId = url.searchParams.get('outletId')
      const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
      const where: any[] = [
        eq(rstShiftAssignments.organizationId, session.orgId),
        gte(rstShiftAssignments.clockIn, new Date(date + 'T00:00:00Z')),
        lte(rstShiftAssignments.clockIn, new Date(date + 'T23:59:59Z')),
      ]
      const assignments = await db.query.rstShiftAssignments.findMany({
        where: and(...where),
        with: { shift: true },
      })
      const uniquePersons = [...new Set(assignments.map((a) => a.personId))]
      const summary = uniquePersons.map((personId) => {
        const personAssignments = assignments.filter((a) => a.personId === personId)
        const totalHours = personAssignments.reduce(
          (s, a) => s + parseFloat(String(a.totalHours ?? 0)),
          0,
        )
        return { personId, totalHours, shifts: personAssignments.length }
      })
      return { data: summary }
    })
}
