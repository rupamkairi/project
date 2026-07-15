import { Elysia } from 'elysia'
import type { Mediator } from '@core'
import { generateId } from '@core'
import { db } from '@db/client'
import { eq, and, desc, sql } from 'drizzle-orm'
import {
  workplacePayrollRun,
  workplacePayslip,
  workplaceEmployee,
  workplaceEmployeeCompensation,
  workplaceSalaryStructure,
  workplaceAttendance,
} from '../../db/schema/workplace'
import { hasPermission } from '../../permissions/matrix'

function safeEval(formula: string, vars: Record<string, number>): number {
  let expr = formula
  for (const [key, val] of Object.entries(vars)) {
    expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(val))
  }
  if (/[^0-9\s+\-*/().%]/.test(expr)) return 0
  try {
    return Function(`"use strict"; return (${expr})`)()
  } catch {
    return 0
  }
}

function computeSalaryComponents(
  components: any,
  ctc: number,
  presentDays: number,
  workingDays: number,
): { earnings: any[]; deductions: any[]; gross: number; net: number } {
  const earnings: any[] = []
  const deductions: any[] = []
  const vars: Record<string, number> = { ctc, presentDays, workingDays }

  for (const comp of components.earnings ?? []) {
    let amount = 0
    if (comp.type === 'fixed') amount = comp.value ?? 0
    else if (comp.type === 'formula') amount = safeEval(comp.formula ?? '0', vars)
    else if (comp.type === 'percentage') {
      const basis = vars[comp.basisOf] ?? 0
      amount = (basis * (comp.rate ?? 0)) / 100
    }
    if (workingDays > 0) amount = (amount * presentDays) / workingDays
    vars[comp.name] = amount
    earnings.push({ name: comp.name, amount: Math.round(amount * 100) / 100 })
  }

  const grossAmount = earnings.reduce((s, e) => s + e.amount, 0)
  vars.gross = grossAmount

  for (const comp of components.deductions ?? []) {
    let amount = 0
    if (comp.type === 'fixed') amount = comp.value ?? 0
    else if (comp.type === 'formula') amount = safeEval(comp.formula ?? '0', vars)
    else if (comp.type === 'percentage') {
      const basis = vars[comp.basisOf] ?? 0
      amount = (basis * (comp.rate ?? 0)) / 100
    }
    vars[comp.name] = amount
    deductions.push({ name: comp.name, amount: Math.round(amount * 100) / 100 })
  }

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)
  return {
    earnings,
    deductions,
    gross: Math.round(grossAmount * 100) / 100,
    net: Math.round((grossAmount - totalDeductions) * 100) / 100,
  }
}

export function createPayrollRunRoutes(mediator: Mediator) {
  return new Elysia({ prefix: '/payroll-runs' })
    .get('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:payroll:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const rows = await db
        .select()
        .from(workplacePayrollRun)
        .where(eq(workplacePayrollRun.organizationId, actor.orgId))
        .orderBy(desc(workplacePayrollRun.createdAt))
        .limit(50)
      return { payrollRuns: rows }
    })
    .post('/', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:payroll:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const body = (ctx as any).body as any
      const period = `${body.year}-${String(body.month).padStart(2, '0')}`
      const [run] = await db
        .insert(workplacePayrollRun)
        .values({
          organizationId: actor.orgId,
          period,
          periodStart: new Date(body.year, body.month - 1, 1),
          periodEnd: new Date(body.year, body.month, 0),
          status: 'draft',
        })
        .returning()
      ;(ctx as any).set.status = 201
      return { payrollRun: run }
    })
    .get('/:id', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:payroll:read')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const [run] = await db
        .select()
        .from(workplacePayrollRun)
        .where(eq(workplacePayrollRun.id, id))
      if (!run) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      const slips = await db
        .select()
        .from(workplacePayslip)
        .where(eq(workplacePayslip.payrollRunId, id))
      return { payrollRun: run, payslips: slips }
    })
    .post('/:id/generate', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:payroll:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const body = (ctx as any).body as any
      const [run] = await db
        .select()
        .from(workplacePayrollRun)
        .where(eq(workplacePayrollRun.id, id))
      if (!run || run.status !== 'draft') {
        ;(ctx as any).set.status = 400
        return { error: 'Payroll run must be in draft status' }
      }

      // Clear existing draft slips
      await db
        .delete(workplacePayslip)
        .where(and(eq(workplacePayslip.payrollRunId, id), eq(workplacePayslip.status, 'draft')))

      const [year, month] = run.period.split('-').map(Number)
      if (year === undefined || month === undefined || Number.isNaN(year) || Number.isNaN(month)) {
        ;(ctx as any).set.status = 400
        return { error: 'Invalid payroll period' }
      }
      const workingDays = new Date(year, month, 0).getDate()

      const employees = await db
        .select()
        .from(workplaceEmployee)
        .where(
          and(
            eq(workplaceEmployee.organizationId, run.organizationId),
            eq(workplaceEmployee.employmentStatus, 'active'),
          ),
        )

      let totalGross = 0
      let totalDeductions = 0
      let totalNet = 0

      for (const emp of employees) {
        const [comp] = await db
          .select()
          .from(workplaceEmployeeCompensation)
          .where(
            and(
              eq(workplaceEmployeeCompensation.employeeId, emp.id),
              eq(workplaceEmployeeCompensation.active, true),
            ),
          )
        if (!comp) continue

        const monthlyCtc = Number(comp.ctc) / 12

        let structure = null
        if (body.structureId || comp.structureId) {
          const [s] = await db
            .select()
            .from(workplaceSalaryStructure)
            .where(
              eq(workplaceSalaryStructure.id, body.structureId ?? (comp.structureId as string)),
            )
          structure = s
        }

        const attendance = await db
          .select()
          .from(workplaceAttendance)
          .where(and(eq(workplaceAttendance.employeeId, emp.id)))
        const presentDays =
          attendance.filter((a) => ['present', 'half-day'].includes(a.status)).length || workingDays

        const defaultComponents = (structure?.components as any) ?? {
          earnings: [
            { name: 'Basic', type: 'formula', formula: 'ctc * 0.5' },
            { name: 'HRA', type: 'percentage', basisOf: 'Basic', rate: 40 },
          ],
          deductions: [
            { name: 'Employee PF', type: 'percentage', basisOf: 'Basic', rate: 12 },
            { name: 'Professional Tax', type: 'fixed', value: 200 },
          ],
        }

        const computed = computeSalaryComponents(
          defaultComponents,
          monthlyCtc,
          presentDays,
          workingDays,
        )

        const [slip] = await db
          .insert(workplacePayslip)
          .values({
            organizationId: run.organizationId,
            payrollRunId: id,
            employeeId: emp.id,
            compensationId: comp.id,
            workingDays,
            presentDays,
            paidDays: presentDays,
            earnings: computed.earnings,
            deductions: computed.deductions,
            gross: String(computed.gross.toFixed(2)),
            net: String(computed.net.toFixed(2)),
            status: 'draft',
          })
          .returning()

        if (slip) {
          totalGross += computed.gross
          totalNet += computed.net
          totalDeductions += computed.gross - computed.net
        }
      }

      await db
        .update(workplacePayrollRun)
        .set({
          totalGross: String(totalGross.toFixed(2)),
          totalDeductions: String(totalDeductions.toFixed(2)),
          totalNet: String(totalNet.toFixed(2)),
          employeeCount: employees.length,
          processedAt: new Date(),
        })
        .where(eq(workplacePayrollRun.id, id))

      return { success: true, slipsGenerated: employees.length, totalGross, totalNet }
    })
    .post('/:id/submit', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:payroll:manage')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const [run] = await db
        .select()
        .from(workplacePayrollRun)
        .where(eq(workplacePayrollRun.id, id))
      if (!run) {
        ;(ctx as any).set.status = 404
        return { error: 'Not found' }
      }
      await db
        .update(workplacePayrollRun)
        .set({
          status: 'submitted',
          processedAt: new Date(),
        })
        .where(eq(workplacePayrollRun.id, id))
      return { success: true, status: 'submitted' }
    })
    .post('/:id/approve', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:payroll:approve')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      await db
        .update(workplacePayrollRun)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          approvedById: actor.actorId,
        })
        .where(eq(workplacePayrollRun.id, id))

      // Publish payslips
      await db
        .update(workplacePayslip)
        .set({
          status: 'published',
          publishedAt: new Date(),
        })
        .where(eq(workplacePayslip.payrollRunId, id))

      return { success: true, status: 'approved' }
    })
    .post('/:id/export-payment', async (ctx) => {
      const actor = (ctx as any).actor
      if (!actor || !hasPermission(actor, 'workplace:payroll:export')) {
        ;(ctx as any).set.status = 403
        return { error: 'Forbidden' }
      }
      const { id } = (ctx as any).params
      const [run] = await db
        .select()
        .from(workplacePayrollRun)
        .where(eq(workplacePayrollRun.id, id))
      if (!run || run.status !== 'approved') {
        ;(ctx as any).set.status = 400
        return { error: 'Run must be approved' }
      }
      const slips = await db
        .select()
        .from(workplacePayslip)
        .where(eq(workplacePayslip.payrollRunId, id))
      const payments = []
      for (const slip of slips) {
        const [comp] = await db
          .select()
          .from(workplaceEmployeeCompensation)
          .where(eq(workplaceEmployeeCompensation.id, slip.compensationId as string))
        payments.push({
          employeeId: slip.employeeId,
          amount: slip.net,
          bankAccount: comp?.bankAccount,
          bankName: comp?.bankName,
          bankIfsc: comp?.bankIfsc,
        })
      }
      await db
        .update(workplacePayrollRun)
        .set({
          paymentExported: true,
          paymentExportedAt: new Date(),
        })
        .where(eq(workplacePayrollRun.id, id))
      return { payments, count: payments.length }
    })
}
