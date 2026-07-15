// Project Management Compose — seed data.
//
// Seeds project management roles into the identity `roles` master table.
// Run after the foundation seed.

import { db } from '@db/client'
import { roles } from '@db/schema/identity'
import { generateId } from '@core'

export const PJM_DEFAULT_ORG_ID = 'org_platform_default'

const PJM_ROLES_SEED = [
  {
    id: 'plt_role_pjm_admin',
    name: 'pjm:admin',
    description: 'Project Management Admin — full access to all projects, portfolios, PSA, reports',
    permissions: ['*:*'],
  },
  {
    id: 'plt_role_pjm_portfolio_manager',
    name: 'pjm:portfolio-manager',
    description: 'Portfolio Manager — manage portfolios and oversee all projects',
    permissions: ['*:read', '*:create', '*:update'],
  },
  {
    id: 'plt_role_pjm_project_manager',
    name: 'pjm:project-manager',
    description: 'Project Manager — full access to owned projects, manage teams, boards, sprints',
    permissions: ['*:read', '*:create', '*:update'],
  },
  {
    id: 'plt_role_pjm_team_member',
    name: 'pjm:team-member',
    description: 'Team Member — work on assigned items, log time, comment',
    permissions: [
      '*:read',
      'work-item:create',
      'work-item:update',
      'worklog:create',
      'comment:create',
    ],
  },
  {
    id: 'plt_role_pjm_finance_manager',
    name: 'pjm:finance-manager',
    description: 'Finance Manager — manage budgets, retainers, billing, financial reports',
    permissions: ['*:read', 'psa:*', 'report:financial'],
  },
  {
    id: 'plt_role_pjm_client_guest',
    name: 'pjm:client-guest',
    description: 'Client Guest — view shared projects, milestones, files, approve deliverables',
    permissions: ['*:read'],
  },
  {
    id: 'plt_role_pjm_viewer',
    name: 'pjm:viewer',
    description: 'Viewer — read-only across all project management records',
    permissions: ['*:read'],
  },
]

export interface SeedProjectManagementResult {
  orgId: string
  roles: string[]
}

export async function seedProjectManagement(
  orgId: string = PJM_DEFAULT_ORG_ID,
): Promise<SeedProjectManagementResult> {
  console.log('Seeding Project Management data...')

  const now = new Date()
  await db
    .insert(roles)
    .values(
      PJM_ROLES_SEED.map((r) => ({
        ...r,
        organizationId: orgId,
        isSystem: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
        deletedAt: null,
      })),
    )
    .onConflictDoNothing()
  console.log('✓ Seeded Project Management roles:', PJM_ROLES_SEED.map((r) => r.name).join(', '))

  console.log('Project Management seed complete.')
  return {
    orgId,
    roles: PJM_ROLES_SEED.map((r) => r.name),
  }
}
