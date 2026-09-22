// Project Management Compose — permissions matrix.
//
// Seven roles filter every record in the compose. Role slugs are seeded into
// the identity `roles` table; auth plugin surfaces them on `ctx.actor.roles`.
// `requirePermission(actor, perm)` is the per-route guard used across all routes.

import type { AuthActor } from '@projectx/plugin-auth-server'
import { AuthorizationError } from '@core'
import { canAccess, COMPOSE_ADMIN_ROLES } from '@projectx/access'

// --- Roles ------------------------------------------------------------------

export const PJM_ROLES = {
  admin: 'pjm:admin',
  portfolioManager: 'pjm:portfolio-manager',
  projectManager: 'pjm:project-manager',
  teamMember: 'pjm:team-member',
  financeManager: 'pjm:finance-manager',
  clientGuest: 'pjm:client-guest',
  viewer: 'pjm:viewer',
} as const

export const PJM_MANAGER_ROLES = [
  PJM_ROLES.admin,
  PJM_ROLES.portfolioManager,
  PJM_ROLES.projectManager,
] as const
export const PJM_FINANCE_ROLES = [
  PJM_ROLES.admin,
  PJM_ROLES.financeManager,
  PJM_ROLES.projectManager,
] as const

// --- Permission matrix ------------------------------------------------------

export const PJM_PERMISSIONS = {
  // portfolios
  'portfolio:read': [
    PJM_ROLES.admin,
    PJM_ROLES.portfolioManager,
    PJM_ROLES.projectManager,
    PJM_ROLES.viewer,
  ],
  'portfolio:create': [PJM_ROLES.admin, PJM_ROLES.portfolioManager],
  'portfolio:update': [PJM_ROLES.admin, PJM_ROLES.portfolioManager],
  'portfolio:delete': [PJM_ROLES.admin, PJM_ROLES.portfolioManager],

  // projects
  'project:read': [
    PJM_ROLES.admin,
    PJM_ROLES.portfolioManager,
    PJM_ROLES.projectManager,
    PJM_ROLES.teamMember,
    PJM_ROLES.viewer,
    PJM_ROLES.clientGuest,
  ],
  'project:create': [PJM_ROLES.admin, PJM_ROLES.portfolioManager, PJM_ROLES.projectManager],
  'project:update': [PJM_ROLES.admin, PJM_ROLES.portfolioManager, PJM_ROLES.projectManager],
  'project:delete': [PJM_ROLES.admin, PJM_ROLES.portfolioManager],
  'project:archive': [PJM_ROLES.admin, PJM_ROLES.portfolioManager, PJM_ROLES.projectManager],

  // work items
  'work-item:read': [
    PJM_ROLES.admin,
    PJM_ROLES.portfolioManager,
    PJM_ROLES.projectManager,
    PJM_ROLES.teamMember,
    PJM_ROLES.viewer,
    PJM_ROLES.clientGuest,
  ],
  'work-item:create': [PJM_ROLES.admin, PJM_ROLES.projectManager, PJM_ROLES.teamMember],
  'work-item:update': [PJM_ROLES.admin, PJM_ROLES.projectManager, PJM_ROLES.teamMember],
  'work-item:delete': [PJM_ROLES.admin, PJM_ROLES.projectManager],
  'work-item:archive': [PJM_ROLES.admin, PJM_ROLES.projectManager],
  'work-item:assign': [PJM_ROLES.admin, PJM_ROLES.projectManager, PJM_ROLES.teamMember],

  // sprints
  'sprint:read': [
    PJM_ROLES.admin,
    PJM_ROLES.portfolioManager,
    PJM_ROLES.projectManager,
    PJM_ROLES.teamMember,
    PJM_ROLES.viewer,
  ],
  'sprint:create': [PJM_ROLES.admin, PJM_ROLES.projectManager],
  'sprint:update': [PJM_ROLES.admin, PJM_ROLES.projectManager],
  'sprint:complete': [PJM_ROLES.admin, PJM_ROLES.projectManager],
  'sprint:delete': [PJM_ROLES.admin, PJM_ROLES.projectManager],

  // boards & columns
  'board:read': [
    PJM_ROLES.admin,
    PJM_ROLES.portfolioManager,
    PJM_ROLES.projectManager,
    PJM_ROLES.teamMember,
    PJM_ROLES.viewer,
    PJM_ROLES.clientGuest,
  ],
  'board:manage': [PJM_ROLES.admin, PJM_ROLES.projectManager],

  // comments
  'comment:read': [
    PJM_ROLES.admin,
    PJM_ROLES.portfolioManager,
    PJM_ROLES.projectManager,
    PJM_ROLES.teamMember,
    PJM_ROLES.viewer,
    PJM_ROLES.clientGuest,
  ],
  'comment:create': [
    PJM_ROLES.admin,
    PJM_ROLES.projectManager,
    PJM_ROLES.teamMember,
    PJM_ROLES.clientGuest,
  ],
  'comment:update': [PJM_ROLES.admin, PJM_ROLES.projectManager, PJM_ROLES.teamMember],
  'comment:delete': [PJM_ROLES.admin, PJM_ROLES.projectManager],

  // worklogs
  'worklog:read': [
    PJM_ROLES.admin,
    PJM_ROLES.portfolioManager,
    PJM_ROLES.projectManager,
    PJM_ROLES.teamMember,
    PJM_ROLES.viewer,
  ],
  'worklog:create': [PJM_ROLES.admin, PJM_ROLES.projectManager, PJM_ROLES.teamMember],
  'worklog:approve': [PJM_ROLES.admin, PJM_ROLES.projectManager],
  'worklog:delete': [PJM_ROLES.admin, PJM_ROLES.projectManager],

  // milestones
  'milestone:read': [
    PJM_ROLES.admin,
    PJM_ROLES.portfolioManager,
    PJM_ROLES.projectManager,
    PJM_ROLES.teamMember,
    PJM_ROLES.viewer,
    PJM_ROLES.clientGuest,
  ],
  'milestone:create': [PJM_ROLES.admin, PJM_ROLES.projectManager],
  'milestone:update': [PJM_ROLES.admin, PJM_ROLES.projectManager],
  'milestone:delete': [PJM_ROLES.admin, PJM_ROLES.projectManager],
  'milestone:approve': [PJM_ROLES.admin, PJM_ROLES.projectManager, PJM_ROLES.clientGuest],

  // clients (party reuse)
  'client:read': [
    PJM_ROLES.admin,
    PJM_ROLES.portfolioManager,
    PJM_ROLES.projectManager,
    PJM_ROLES.financeManager,
    PJM_ROLES.viewer,
  ],
  'client:manage': [PJM_ROLES.admin, PJM_ROLES.portfolioManager, PJM_ROLES.projectManager],

  // PSA — financial
  'psa:read': [
    PJM_ROLES.admin,
    PJM_ROLES.portfolioManager,
    PJM_ROLES.projectManager,
    PJM_ROLES.financeManager,
  ],
  'psa:manage': [PJM_ROLES.admin, PJM_ROLES.financeManager],
  'psa:rates': [PJM_ROLES.admin, PJM_ROLES.financeManager, PJM_ROLES.projectManager],
  'psa:budgets': [PJM_ROLES.admin, PJM_ROLES.financeManager, PJM_ROLES.projectManager],
  'psa:billing': [PJM_ROLES.admin, PJM_ROLES.financeManager],

  // reports
  'report:read': [
    PJM_ROLES.admin,
    PJM_ROLES.portfolioManager,
    PJM_ROLES.projectManager,
    PJM_ROLES.financeManager,
    PJM_ROLES.viewer,
    PJM_ROLES.clientGuest,
  ],
  'report:financial': [PJM_ROLES.admin, PJM_ROLES.financeManager, PJM_ROLES.portfolioManager],

  // my work
  'my-work:read': [
    PJM_ROLES.admin,
    PJM_ROLES.portfolioManager,
    PJM_ROLES.projectManager,
    PJM_ROLES.teamMember,
    PJM_ROLES.viewer,
  ],
} as const

export type PjmPermission = keyof typeof PJM_PERMISSIONS

// --- Guards -----------------------------------------------------------------

export function requirePermission(
  actor: AuthActor | null | undefined,
  permission: PjmPermission,
): void {
  if (!actor) {
    throw new AuthorizationError('Authentication required', { reason: 'AUTH_REQUIRED' })
  }
  const allowed = PJM_PERMISSIONS[permission]
  if (
    canAccess(actor, permission, {
      composeAdminRoles: COMPOSE_ADMIN_ROLES['project-management'],
    }) ||
    allowed.some((r) => actor.roles.includes(r))
  ) {
    return
  }
  throw new AuthorizationError(`Missing permission: ${permission}`, {
    reason: 'FORBIDDEN',
    permission,
  })
}

export function isManager(actor: AuthActor): boolean {
  return (PJM_MANAGER_ROLES as readonly string[]).some((r) => actor.roles.includes(r))
}

export function isFinance(actor: AuthActor): boolean {
  return (PJM_FINANCE_ROLES as readonly string[]).some((r) => actor.roles.includes(r))
}

export function isGuest(actor: AuthActor): boolean {
  return actor.roles.includes(PJM_ROLES.clientGuest)
}
