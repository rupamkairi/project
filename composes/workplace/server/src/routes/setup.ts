import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { db } from '@db/client'
import { eq } from 'drizzle-orm'
import {
  workplaceDepartment,
  workplacePosition,
  workplaceLeaveType,
  workplaceShift,
  workplacePayComponent,
  workplaceSalaryStructure,
  workplacePolicy,
  workplaceRoom,
  workplaceReviewCycle,
} from '../db/schema/workplace'
import { hasPermission } from '../permissions/matrix'

export function createSetupRoutes(mediator: Mediator) {
  return (
    new Elysia({ prefix: '/setup' })
      .get('/status', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor || !hasPermission(actor, 'workplace:settings:read')) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const orgId = actor.orgId

        const [
          departments,
          positions,
          leaveTypes,
          shifts,
          payComponents,
          salaryStructures,
          policies,
          rooms,
        ] = await Promise.all([
          db
            .select()
            .from(workplaceDepartment)
            .where(eq(workplaceDepartment.organizationId, orgId))
            .then((r) => r.length),
          db
            .select()
            .from(workplacePosition)
            .where(eq(workplacePosition.organizationId, orgId))
            .then((r) => r.length),
          db
            .select()
            .from(workplaceLeaveType)
            .where(eq(workplaceLeaveType.organizationId, orgId))
            .then((r) => r.length),
          db
            .select()
            .from(workplaceShift)
            .where(eq(workplaceShift.organizationId, orgId))
            .then((r) => r.length),
          db
            .select()
            .from(workplacePayComponent)
            .where(eq(workplacePayComponent.organizationId, orgId))
            .then((r) => r.length),
          db
            .select()
            .from(workplaceSalaryStructure)
            .where(eq(workplaceSalaryStructure.organizationId, orgId))
            .then((r) => r.length),
          db
            .select()
            .from(workplacePolicy)
            .where(eq(workplacePolicy.organizationId, orgId))
            .then((r) => r.length),
          db
            .select()
            .from(workplaceRoom)
            .where(eq(workplaceRoom.organizationId, orgId))
            .then((r) => r.length),
        ])

        const steps = [
          {
            key: 'departments',
            label: 'Departments & Positions',
            required: true,
            count: departments + positions,
          },
          { key: 'leavePolicy', label: 'Leave Policy', required: true, count: leaveTypes },
          {
            key: 'payrollConfig',
            label: 'Payroll Configuration',
            required: true,
            count: payComponents + salaryStructures,
          },
          { key: 'shifts', label: 'Work Shifts', required: false, count: shifts },
          { key: 'policies', label: 'Office Policies', required: false, count: policies },
          { key: 'rooms', label: 'Meeting Rooms', required: false, count: rooms },
          { key: 'workweek', label: 'Workweek Settings', required: true, count: 1 },
        ]

        const completed = steps.filter((s) => s.count > 0 || !s.required).length
        const total = steps.length

        return {
          progress: { completed, total, percent: Math.round((completed / total) * 100) },
          steps: steps.map((s) => ({
            ...s,
            completed: s.count > 0 || !s.required,
          })),
        }
      })

      // Bulk seed all setup items
      .post('/bootstrap', async (ctx) => {
        const actor = (ctx as any).actor
        if (!actor || !hasPermission(actor, 'workplace:settings:manage')) {
          ;(ctx as any).set.status = 403
          return { error: 'Forbidden' }
        }
        const orgId = actor.orgId
        const body = (ctx as any).body as any
        const results: Record<string, number> = {}

        // Departments
        if (body.departments?.length) {
          const vals = body.departments.map((d: any) => ({
            organizationId: orgId,
            name: d.name,
            code: d.code,
            parentId: d.parentId,
            managerId: d.managerId,
          }))
          await db.insert(workplaceDepartment).values(vals).onConflictDoNothing()
          results.departments = vals.length
        }

        // Positions
        if (body.positions?.length) {
          const vals = body.positions.map((p: any) => ({
            organizationId: orgId,
            name: p.name,
            level: p.level ?? 1,
            departmentId: p.departmentId,
            isHead: p.isHead ?? false,
            headCount: p.headCount ?? 1,
          }))
          await db.insert(workplacePosition).values(vals).onConflictDoNothing()
          results.positions = vals.length
        }

        // Leave Types
        if (body.leaveTypes?.length) {
          const vals = body.leaveTypes.map((l: any) => ({
            organizationId: orgId,
            name: l.name,
            code: l.code,
            maxDays: l.maxDays ?? 0,
            isPaid: l.isPaid ?? true,
            isCarryForward: l.isCarryForward ?? false,
            maxCarryForward: l.maxCarryForward ?? 0,
            requiresDocuments: l.requiresDocuments ?? false,
          }))
          await db.insert(workplaceLeaveType).values(vals).onConflictDoNothing()
          results.leaveTypes = vals.length
        }

        // Shifts
        if (body.shifts?.length) {
          const vals = body.shifts.map((s: any) => ({
            organizationId: orgId,
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            breakMinutes: s.breakMinutes ?? 60,
            color: s.color,
          }))
          await db.insert(workplaceShift).values(vals).onConflictDoNothing()
          results.shifts = vals.length
        }

        // Policies
        if (body.policies?.length) {
          const vals = body.policies.map((p: any) => ({
            organizationId: orgId,
            title: p.title,
            category: p.category,
            version: 1,
            isActive: true,
          }))
          await db.insert(workplacePolicy).values(vals).onConflictDoNothing()
          results.policies = vals.length
        }

        // Rooms
        if (body.rooms?.length) {
          const vals = body.rooms.map((r: any) => ({
            organizationId: orgId,
            name: r.name,
            floor: r.floor,
            capacity: r.capacity ?? 1,
            amenities: r.amenities ?? [],
          }))
          await db.insert(workplaceRoom).values(vals).onConflictDoNothing()
          results.rooms = vals.length
        }

        // Salary Structure
        if (body.salaryStructure) {
          await db
            .insert(workplaceSalaryStructure)
            .values({
              organizationId: orgId,
              name: body.salaryStructure.name ?? 'Standard',
              isDefault: true,
              components: body.salaryStructure.components ?? {},
            })
            .onConflictDoNothing()
          results.salaryStructure = 1
        }

        return { results, message: 'Setup data saved' }
      })
  )
}
