import { canAccess, COMPOSE_ADMIN_ROLES } from '@projectx/access'
import type { AccessActorLike } from '@projectx/access'
import { AuthorizationError } from '@core'

export function requireRestaurantPermission(
  actor: AccessActorLike | null | undefined,
  permission: string,
): void {
  if (!actor) {
    throw new AuthorizationError('Authentication required', { reason: 'AUTH_REQUIRED' })
  }
  if (!canAccess(actor, permission, { composeAdminRoles: COMPOSE_ADMIN_ROLES.restaurant })) {
    throw new AuthorizationError(`Missing permission: ${permission}`, {
      reason: 'FORBIDDEN',
      permission,
    })
  }
}

export function restaurantPermissionForPath(path: string, method: string): string {
  const rest = path.replace(/^\/restaurants/, '') || '/'
  if (rest.startsWith('/menu')) {
    return method === 'GET' ? 'restaurant:read:*' : 'restaurant:manage:menu'
  }
  if (rest.startsWith('/outlets')) {
    return method === 'GET' ? 'restaurant:read:*' : 'restaurant:manage:outlet'
  }
  if (rest.startsWith('/orders') || rest.startsWith('/kots')) {
    return method === 'GET' ? 'restaurant:read:orders' : 'restaurant:create:orders'
  }
  if (rest.startsWith('/billing')) {
    return method === 'GET' ? 'restaurant:read:orders' : 'restaurant:manage:billing'
  }
  if (rest.startsWith('/inventory')) {
    return method === 'GET' ? 'restaurant:read:inventory' : 'restaurant:manage:inventory'
  }
  if (rest.startsWith('/staff')) {
    return method === 'GET' ? 'restaurant:read:*' : 'restaurant:manage:staff'
  }
  return method === 'GET' ? 'restaurant:read:*' : 'restaurant:*'
}
