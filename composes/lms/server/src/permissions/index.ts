import { canAccess, COMPOSE_ADMIN_ROLES } from '@projectx/access'
import type { AccessActorLike } from '@projectx/access'
import { AuthorizationError } from '@core'

export const LMS_ADMIN_ROLES = COMPOSE_ADMIN_ROLES.lms

export function hasPermission(actor: AccessActorLike | null | undefined, perm: string): boolean {
  if (!actor) return false
  return canAccess(actor, perm, { composeAdminRoles: LMS_ADMIN_ROLES })
}

export function requirePermission(actor: AccessActorLike | null | undefined, perm: string): void {
  if (!actor) {
    throw new AuthorizationError('Authentication required', { reason: 'AUTH_REQUIRED' })
  }
  if (!hasPermission(actor, perm)) {
    throw new AuthorizationError(`Missing permission: ${perm}`, {
      reason: 'FORBIDDEN',
      permission: perm,
    })
  }
}

export const LMS_PERMISSIONS = [
  'course:create',
  'course:read',
  'course:update',
  'course:publish',
  'course:archive',
  'module:create',
  'module:read',
  'module:update',
  'enrollment:create',
  'enrollment:read',
  'enrollment:manage',
  'cohort:create',
  'cohort:manage',
  'session:create',
  'session:start',
  'assignment:create',
  'submission:create',
  'submission:grade',
  'certificate:read',
  'certificate:revoke',
  'analytics:read',
] as const
