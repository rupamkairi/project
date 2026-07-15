import { Elysia } from 'elysia'
import type { Mediator, EventBus } from '@core'
import { generateId, createDomainEvent } from '@core'
import { db } from '@db/client'
import { eq, and, desc } from 'drizzle-orm'
import {
  workplaceApplication,
  workplaceInterview,
  workplaceOffer,
  workplaceEmployee,
  workplaceContract,
} from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

export function createApplicationRoutes(mediator: Mediator, bus: EventBus) {
  return new Elysia({ prefix: '/applications' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:recruitment:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { jobOpeningId } = (ctx as any).query ?? {}
      const rows = await db
        .select()
        .from(workplaceApplication)
        .where(
          and(
            eq(workplaceApplication.organizationId, actor.orgId),
            jobOpeningId ? eq(workplaceApplication.jobOpeningId, jobOpeningId) : undefined,
          ),
        )
        .orderBy(desc(workplaceApplication.appliedAt))
      return { applications: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:recruitment:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const [app] = await db
        .insert(workplaceApplication)
        .values({
          organizationId: actor.orgId,
          jobOpeningId: body.jobOpeningId,
          personId: body.personId,
          candidateName: body.candidateName,
          candidateEmail: body.candidateEmail,
          candidatePhone: body.candidatePhone,
          resumeDocumentId: body.resumeDocumentId,
          currentCtc: body.currentCtc,
          expectedCtc: body.expectedCtc,
          noticePeriodDays: body.noticePeriodDays,
          source: body.source,
          status: 'screening',
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { application: app }
    })
    .patch('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:recruitment:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      await db
        .update(workplaceApplication)
        .set({
          stageId: body.stageId,
          status: body.status,
        })
        .where(eq(workplaceApplication.id, id))
      return { success: true }
    })
    .post('/:id/shortlist', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:recruitment:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await db
        .update(workplaceApplication)
        .set({ status: 'shortlisted' })
        .where(eq(workplaceApplication.id, id))
      return { success: true }
    })
    .post('/:id/reject', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:recruitment:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await db
        .update(workplaceApplication)
        .set({ status: 'rejected' })
        .where(eq(workplaceApplication.id, id))
      return { success: true }
    })
    .get('/:id/interviews', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:interviews:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const rows = await db
        .select()
        .from(workplaceInterview)
        .where(eq(workplaceInterview.applicationId, id))
        .orderBy(desc(workplaceInterview.scheduledAt))
      return { interviews: rows }
    })
    .post('/:id/interviews', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:interviews:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      const [ivw] = await db
        .insert(workplaceInterview)
        .values({
          organizationId: actor.orgId,
          applicationId: id,
          interviewerId: body.interviewerId,
          round: body.round ?? 1,
          type: body.type ?? 'technical',
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          durationMinutes: body.durationMinutes ?? 60,
          location: body.location,
          meetingLink: body.meetingLink,
          status: 'scheduled',
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { interview: ivw }
    })
    .post('/:id/offer', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:offers:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      const [app] = await db
        .select()
        .from(workplaceApplication)
        .where(eq(workplaceApplication.id, id))
      if (!app) {
        ;(ctx as any).set.status = 404
        return { error: 'Application not found' }
      }

      const [offer] = await db
        .insert(workplaceOffer)
        .values({
          organizationId: actor.orgId,
          applicationId: id,
          positionId: body.positionId,
          departmentId: body.departmentId,
          offeredCtc: body.offeredCtc,
          joiningDate: body.joiningDate ? new Date(body.joiningDate) : undefined,
          validityDays: body.validityDays ?? 7,
          status: 'draft',
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { offer }
    })
    .post('/:id/hire', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:recruitment:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      const [app] = await db
        .select()
        .from(workplaceApplication)
        .where(eq(workplaceApplication.id, id))
      if (!app) {
        ;(ctx as any).set.status = 404
        return { error: 'Application not found' }
      }

      // Check if personId already has an employee record
      if (app.personId) {
        const [existing] = await db
          .select()
          .from(workplaceEmployee)
          .where(
            and(
              eq(workplaceEmployee.personId, app.personId),
              eq(workplaceEmployee.organizationId, actor.orgId),
            ),
          )
        if (existing) {
          ;(ctx as any).set.status = 409
          return { error: 'Person is already an employee' }
        }
      }

      // Use existing personId or create new
      let personId = app.personId
      if (!personId) {
        const result = await mediator.dispatch({
          type: 'person.createPerson',
          payload: {
            organizationId: actor.orgId,
            type: 'employee',
            firstName: app.candidateName?.split(' ')[0] ?? app.candidateName,
            lastName: app.candidateName?.split(' ').slice(1).join(' ') ?? '',
            email: app.candidateEmail,
            phone: app.candidatePhone,
          },
          actorId: actor.actorId,
          orgId: actor.orgId,
          correlationId: (app as any).id ?? '',
        })
        personId = String((result as any)?.id ?? result)
      }

      const [emp] = await db
        .insert(workplaceEmployee)
        .values({
          organizationId: actor.orgId,
          personId: personId,
          positionId: body.positionId ?? app.jobOpeningId,
          departmentId: body.departmentId,
          managerId: body.managerId,
          employmentType: body.employmentType ?? 'permanent',
          employmentStatus: 'preboarding',
          joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
          meta: { source: 'recruitment', applicationId: id },
        })
        .returning()

      if (!emp) {
        ;(ctx as any).set.status = 500
        return { error: 'Employee was not created' }
      }

      // Create draft contract
      if (body.ctc) {
        await db.insert(workplaceContract).values({
          organizationId: actor.orgId,
          employeeId: emp.id,
          type: body.employmentType ?? 'permanent',
          startDate: new Date(body.joinDate ?? new Date()),
          probationMonths: body.probationMonths ?? 6,
          noticePeriodDays: body.noticePeriodDays ?? 30,
          ctc: body.ctc,
          status: 'draft',
        })
      }

      // Update application status
      await db
        .update(workplaceApplication)
        .set({ status: 'hired' })
        .where(eq(workplaceApplication.id, id))

      // Emit hired event for workflow orchestration
      await bus.publish(
        createDomainEvent(
          'workplace.employee.hired',
          emp.id,
          'workplace.employee',
          { employeeId: emp.id, personId: personId, orgId: actor.orgId, joinDate: body.joinDate },
          actor.orgId,
          { actorId: actor.actorId, correlationId: generateId(), source: 'workplace' },
        ),
      )
      ;(ctx as any).set.status = 201
      return { employee: emp, status: 'hired' }
    })
}
