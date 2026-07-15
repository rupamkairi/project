import { db } from '@db/client'
import {
  workplaceDepartment,
  workplacePosition,
  workplaceLeaveType,
  workplaceShift,
  workplacePayComponent,
  workplaceSalaryStructure,
  workplaceReviewCycle,
  workplacePolicy,
  workplaceRoom,
} from '../schema/workplace'
import { seedWorkflowTemplates } from './templates'

const ORG_ID = process.env.SEED_ORG_ID ?? 'org_default'

async function seedDepartments() {
  const depts = [
    { name: 'Management' },
    { name: 'Finance & Accounts' },
    { name: 'Human Resources' },
    { name: 'Sales & Marketing' },
    { name: 'Operations' },
    { name: 'Procurement' },
    { name: 'Information Technology' },
    { name: 'Manufacturing' },
  ]

  const deptIds: Record<string, string> = {}
  for (const d of depts) {
    const [dept] = await db
      .insert(workplaceDepartment)
      .values({ organizationId: ORG_ID, name: d.name })
      .onConflictDoNothing()
      .returning()
    if (dept) deptIds[d.name] = dept.id
  }

  const positions = [
    { name: 'CEO', dept: 'Management', level: 10, isHead: true },
    { name: 'CFO', dept: 'Finance & Accounts', level: 9, isHead: true },
    { name: 'HR Manager', dept: 'Human Resources', level: 8, isHead: true },
    { name: 'HR Executive', dept: 'Human Resources', level: 5 },
    { name: 'Sales Manager', dept: 'Sales & Marketing', level: 8, isHead: true },
    { name: 'Sales Executive', dept: 'Sales & Marketing', level: 5 },
    { name: 'Accounts Manager', dept: 'Finance & Accounts', level: 8, isHead: true },
    { name: 'Accounts Executive', dept: 'Finance & Accounts', level: 5 },
    { name: 'Operations Manager', dept: 'Operations', level: 8, isHead: true },
    { name: 'Procurement Officer', dept: 'Procurement', level: 6 },
    { name: 'IT Manager', dept: 'Information Technology', level: 8, isHead: true },
    { name: 'Software Engineer', dept: 'Information Technology', level: 6 },
    { name: 'Production Manager', dept: 'Manufacturing', level: 8, isHead: true },
    { name: 'Production Supervisor', dept: 'Manufacturing', level: 6 },
  ]

  for (const p of positions) {
    await db
      .insert(workplacePosition)
      .values({
        organizationId: ORG_ID,
        name: p.name,
        level: p.level,
        departmentId: deptIds[p.dept] ?? null,
        isHead: p.isHead ?? false,
      })
      .onConflictDoNothing()
  }
}

async function seedLeaveTypes() {
  const types = [
    {
      name: 'Annual Leave',
      code: 'AL',
      maxDays: 21,
      isPaid: true,
      isCarryForward: true,
      maxCarryForward: 10,
    },
    { name: 'Sick Leave', code: 'SL', maxDays: 12, isPaid: true },
    { name: 'Casual Leave', code: 'CL', maxDays: 7, isPaid: true },
    { name: 'Maternity Leave', code: 'ML', maxDays: 180, isPaid: true, requiresDocuments: true },
    { name: 'Paternity Leave', code: 'PL', maxDays: 15, isPaid: true },
    { name: 'Unpaid Leave', code: 'LOP', maxDays: 0, isPaid: false },
    { name: 'Compensatory Off', code: 'CO', maxDays: 5, isPaid: true },
  ]

  for (const t of types) {
    await db
      .insert(workplaceLeaveType)
      .values({
        organizationId: ORG_ID,
        name: t.name,
        code: t.code,
        maxDays: t.maxDays,
        isPaid: t.isPaid ?? true,
        isCarryForward: t.isCarryForward ?? false,
        maxCarryForward: t.maxCarryForward ?? 0,
        requiresDocuments: t.requiresDocuments ?? false,
      })
      .onConflictDoNothing()
  }
}

async function seedShifts() {
  const shifts = [
    { name: 'Morning', startTime: '06:00', endTime: '14:00', breakMinutes: 60, color: '#f59e0b' },
    { name: 'General', startTime: '09:00', endTime: '17:00', breakMinutes: 60, color: '#3b82f6' },
    { name: 'Evening', startTime: '14:00', endTime: '22:00', breakMinutes: 60, color: '#8b5cf6' },
    { name: 'Night', startTime: '22:00', endTime: '06:00', breakMinutes: 60, color: '#1e293b' },
  ]

  for (const s of shifts) {
    await db
      .insert(workplaceShift)
      .values({ organizationId: ORG_ID, ...s })
      .onConflictDoNothing()
  }
}

async function seedPayComponents() {
  const components = [
    {
      name: 'Basic',
      code: 'BASIC',
      type: 'earning',
      isTaxable: true,
      calculationMethod: 'formula',
      formula: 'ctc * 0.5',
    },
    {
      name: 'HRA',
      code: 'HRA',
      type: 'earning',
      isTaxable: true,
      calculationMethod: 'percentage',
      formula: '0.4',
      defaultValue: '0',
    },
    {
      name: 'Conveyance',
      code: 'CONV',
      type: 'earning',
      isTaxable: false,
      calculationMethod: 'fixed',
      formula: '0',
      defaultValue: '1600',
    },
    {
      name: 'Medical',
      code: 'MED',
      type: 'earning',
      isTaxable: false,
      calculationMethod: 'fixed',
      formula: '0',
      defaultValue: '1250',
    },
    {
      name: 'Special Allowance',
      code: 'SPCL',
      type: 'earning',
      isTaxable: true,
      calculationMethod: 'formula',
      formula: 'gross - (Basic + HRA + Conveyance + Medical)',
    },
    {
      name: 'Employee PF',
      code: 'EPF',
      type: 'deduction',
      isTaxable: false,
      calculationMethod: 'percentage',
      formula: '0.12',
      defaultValue: '0',
    },
    {
      name: 'Employee ESI',
      code: 'ESI_E',
      type: 'deduction',
      isTaxable: false,
      calculationMethod: 'percentage',
      formula: '0.0075',
      defaultValue: '0',
    },
    {
      name: 'Professional Tax',
      code: 'PT',
      type: 'deduction',
      isTaxable: false,
      calculationMethod: 'fixed',
      formula: '0',
      defaultValue: '200',
    },
    {
      name: 'TDS',
      code: 'TDS',
      type: 'deduction',
      isTaxable: false,
      calculationMethod: 'formula',
      formula: 'taxable_income * 0.1',
    },
  ]

  for (const c of components) {
    await db
      .insert(workplacePayComponent)
      .values({ organizationId: ORG_ID, ...c })
      .onConflictDoNothing()
  }
}

async function seedSalaryStructure() {
  await db
    .insert(workplaceSalaryStructure)
    .values({
      organizationId: ORG_ID,
      name: 'Standard',
      isDefault: true,
      components: {
        earnings: [
          { name: 'Basic', type: 'formula', formula: 'ctc * 0.5' },
          { name: 'HRA', type: 'percentage', basisOf: 'Basic', rate: 40 },
          { name: 'Conveyance', type: 'fixed', value: 1600 },
          { name: 'Medical', type: 'fixed', value: 1250 },
          {
            name: 'Special Allowance',
            type: 'formula',
            formula: 'gross - (Basic + HRA + Conveyance + Medical)',
          },
        ],
        deductions: [
          { name: 'Employee PF', type: 'percentage', basisOf: 'Basic', rate: 12 },
          { name: 'Professional Tax', type: 'fixed', value: 200 },
        ],
      },
    })
    .onConflictDoNothing()
}

async function seedPolicies() {
  const policies = [
    { title: 'Code of Conduct', category: 'governance' },
    { title: 'Leave Policy', category: 'hr' },
    { title: 'IT & Security Policy', category: 'it' },
    { title: 'Travel & Expense Policy', category: 'finance' },
    { title: 'Anti-Harassment Policy', category: 'governance' },
  ]

  for (const p of policies) {
    await db
      .insert(workplacePolicy)
      .values({
        organizationId: ORG_ID,
        title: p.title,
        category: p.category,
        version: 1,
        isActive: true,
      })
      .onConflictDoNothing()
  }
}

async function seedRooms() {
  const rooms = [
    { name: 'Conference Room A', floor: '1st', capacity: 12 },
    { name: 'Conference Room B', floor: '1st', capacity: 8 },
    { name: 'Meeting Room 1', floor: '2nd', capacity: 4 },
    { name: 'Meeting Room 2', floor: '2nd', capacity: 4 },
    { name: 'Board Room', floor: '3rd', capacity: 20 },
    { name: 'Interview Room', floor: '1st', capacity: 3 },
  ]

  for (const r of rooms) {
    await db
      .insert(workplaceRoom)
      .values({ organizationId: ORG_ID, ...r })
      .onConflictDoNothing()
  }
}

export async function seedWorkplace() {
  console.log('Seeding Workplace data...')
  await seedDepartments()
  await seedLeaveTypes()
  await seedShifts()
  await seedPayComponents()
  await seedSalaryStructure()
  await seedPolicies()
  await seedRooms()
  await seedWorkflowTemplates()
  console.log('Workplace seed complete.')
}

if (import.meta.main) {
  await seedWorkplace()
  process.exit(0)
}
