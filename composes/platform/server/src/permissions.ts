import { canAccess, COMPOSE_ADMIN_ROLES } from '@projectx/access'
import type { AuthActor } from '@projectx/plugin-auth-server'
import { AuthorizationError } from '@core'

export function requirePlatformPermission(
  actor: AuthActor | null | undefined,
  permission: string,
): void {
  if (!actor) {
    throw new AuthorizationError('Authentication required', { reason: 'AUTH_REQUIRED' })
  }
  if (!canAccess(actor, permission, { composeAdminRoles: COMPOSE_ADMIN_ROLES.platform })) {
    throw new AuthorizationError(`Missing permission: ${permission}`, {
      reason: 'FORBIDDEN',
      permission,
    })
  }
}
