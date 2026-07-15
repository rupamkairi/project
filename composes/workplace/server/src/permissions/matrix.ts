export const WORKPLACE_ROLES = {
  ADMIN: 'workplace:admin',
  HR_MANAGER: 'workplace:hr-manager',
  RECRUITER: 'workplace:recruiter',
  PAYROLL_MANAGER: 'workplace:payroll-manager',
  OFFICE_MANAGER: 'workplace:office-manager',
  PEOPLE_MANAGER: 'workplace:people-manager',
  EMPLOYEE: 'workplace:employee',
  AUDITOR: 'workplace:auditor',
} as const

export type WorkplaceRole = (typeof WORKPLACE_ROLES)[keyof typeof WORKPLACE_ROLES]

const MANAGER_ROLES = [
  WORKPLACE_ROLES.ADMIN,
  WORKPLACE_ROLES.HR_MANAGER,
  WORKPLACE_ROLES.PEOPLE_MANAGER,
]

const HR_ROLES = [WORKPLACE_ROLES.ADMIN, WORKPLACE_ROLES.HR_MANAGER]

const PAYROLL_ROLES = [WORKPLACE_ROLES.ADMIN, WORKPLACE_ROLES.PAYROLL_MANAGER]

const OFFICE_ROLES = [WORKPLACE_ROLES.ADMIN, WORKPLACE_ROLES.OFFICE_MANAGER]

const ALL_EMPLOYEE_ROLES = [
  WORKPLACE_ROLES.ADMIN,
  WORKPLACE_ROLES.HR_MANAGER,
  WORKPLACE_ROLES.RECRUITER,
  WORKPLACE_ROLES.PAYROLL_MANAGER,
  WORKPLACE_ROLES.OFFICE_MANAGER,
  WORKPLACE_ROLES.PEOPLE_MANAGER,
  WORKPLACE_ROLES.EMPLOYEE,
  WORKPLACE_ROLES.AUDITOR,
]

export function hasPermission(
  actor: { roles: string[]; permissions: string[] },
  permission: string,
): boolean {
  const { roles, permissions } = actor
  if (roles.includes(WORKPLACE_ROLES.ADMIN)) return true
  if (permissions.includes('workplace:*')) return true
  return permissions.includes(permission)
}

export const PERMISSION_MAP: Record<string, WorkplaceRole[]> = {
  // People
  'workplace:people:read': [...HR_ROLES, ...MANAGER_ROLES, WORKPLACE_ROLES.AUDITOR],
  'workplace:people:manage': [...HR_ROLES],
  'workplace:people:delete': [WORKPLACE_ROLES.ADMIN],
  'workplace:departments:read': [...ALL_EMPLOYEE_ROLES],
  'workplace:departments:manage': [...HR_ROLES],
  'workplace:positions:read': [...ALL_EMPLOYEE_ROLES],
  'workplace:positions:manage': [...HR_ROLES],
  'workplace:contracts:read': [...HR_ROLES, ...MANAGER_ROLES, WORKPLACE_ROLES.AUDITOR],
  'workplace:contracts:manage': [...HR_ROLES],

  // Recruitment
  'workplace:recruitment:read': [...HR_ROLES, WORKPLACE_ROLES.RECRUITER, ...MANAGER_ROLES],
  'workplace:recruitment:manage': [...HR_ROLES, WORKPLACE_ROLES.RECRUITER],
  'workplace:interviews:read': [...HR_ROLES, WORKPLACE_ROLES.RECRUITER, ...MANAGER_ROLES],
  'workplace:interviews:manage': [...HR_ROLES, WORKPLACE_ROLES.RECRUITER],
  'workplace:offers:read': [...HR_ROLES, WORKPLACE_ROLES.RECRUITER, ...MANAGER_ROLES],
  'workplace:offers:manage': [...HR_ROLES, WORKPLACE_ROLES.RECRUITER],

  // Work
  'workplace:leave:read': [
    ...HR_ROLES,
    ...MANAGER_ROLES,
    WORKPLACE_ROLES.EMPLOYEE,
    WORKPLACE_ROLES.AUDITOR,
  ],
  'workplace:leave:manage': [...HR_ROLES, ...MANAGER_ROLES],
  'workplace:leave:approve': [...HR_ROLES, ...MANAGER_ROLES],
  'workplace:attendance:read': [
    ...HR_ROLES,
    ...MANAGER_ROLES,
    WORKPLACE_ROLES.EMPLOYEE,
    WORKPLACE_ROLES.AUDITOR,
  ],
  'workplace:attendance:manage': [...HR_ROLES],
  'workplace:timesheets:read': [...HR_ROLES, ...MANAGER_ROLES, WORKPLACE_ROLES.EMPLOYEE],
  'workplace:timesheets:manage': [...MANAGER_ROLES],
  'workplace:timesheets:approve': [...MANAGER_ROLES],
  'workplace:shifts:read': [...HR_ROLES, ...MANAGER_ROLES, ...ALL_EMPLOYEE_ROLES],
  'workplace:shifts:manage': [...HR_ROLES, ...MANAGER_ROLES],

  // Performance
  'workplace:performance:read': [...HR_ROLES, ...MANAGER_ROLES, WORKPLACE_ROLES.EMPLOYEE],
  'workplace:performance:manage': [...HR_ROLES, ...MANAGER_ROLES],
  'workplace:reviews:read': [...HR_ROLES, ...MANAGER_ROLES, WORKPLACE_ROLES.EMPLOYEE],
  'workplace:reviews:manage': [...HR_ROLES, ...MANAGER_ROLES],

  // Payroll
  'workplace:payroll:read': [...PAYROLL_ROLES, ...HR_ROLES],
  'workplace:payroll:manage': [...PAYROLL_ROLES],
  'workplace:payroll:approve': [...PAYROLL_ROLES],
  'workplace:payroll:export': [...PAYROLL_ROLES],
  'workplace:compensation:read': [...HR_ROLES, ...PAYROLL_ROLES],
  'workplace:compensation:manage': [...HR_ROLES, ...PAYROLL_ROLES],
  'workplace:payslip:self': [...ALL_EMPLOYEE_ROLES],

  // Office
  'workplace:expenses:read': [...OFFICE_ROLES, ...HR_ROLES, ...MANAGER_ROLES],
  'workplace:expenses:manage': [...OFFICE_ROLES],
  'workplace:expenses:approve': [...OFFICE_ROLES, ...MANAGER_ROLES],
  'workplace:assets:read': [...OFFICE_ROLES, ...HR_ROLES],
  'workplace:assets:manage': [...OFFICE_ROLES],
  'workplace:policies:read': [...ALL_EMPLOYEE_ROLES],
  'workplace:policies:manage': [...HR_ROLES],
  'workplace:announcements:read': [...ALL_EMPLOYEE_ROLES],
  'workplace:announcements:manage': [...HR_ROLES, ...MANAGER_ROLES],
  'workplace:visitors:read': [...OFFICE_ROLES, ...HR_ROLES, WORKPLACE_ROLES.EMPLOYEE],
  'workplace:visitors:manage': [...OFFICE_ROLES, WORKPLACE_ROLES.EMPLOYEE],
  'workplace:rooms:read': [...ALL_EMPLOYEE_ROLES],
  'workplace:rooms:book': [...ALL_EMPLOYEE_ROLES],
  'workplace:rooms:manage': [...OFFICE_ROLES],

  // Reports
  'workplace:reports:read': [
    ...HR_ROLES,
    ...PAYROLL_ROLES,
    ...MANAGER_ROLES,
    WORKPLACE_ROLES.AUDITOR,
  ],

  // Settings
  'workplace:settings:read': [...HR_ROLES],
  'workplace:settings:manage': [...HR_ROLES, WORKPLACE_ROLES.ADMIN],

  // Employee self-service
  'workplace:my:read': [...ALL_EMPLOYEE_ROLES],
}
