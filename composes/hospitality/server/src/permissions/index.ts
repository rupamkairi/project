import type { AuthActor } from '@projectx/plugin-auth-server'
import { AuthorizationError } from '@core'
import { canAccess, COMPOSE_ADMIN_ROLES } from '@projectx/access'

export const HSP_ROLES = {
  admin: 'hsp:admin',
  owner: 'hsp:owner',
  propertyManager: 'hsp:property-manager',
  reservations: 'hsp:reservations',
  frontDesk: 'hsp:front-desk',
  housekeeping: 'hsp:housekeeping',
  cashier: 'hsp:cashier',
  serviceDesk: 'hsp:service-desk',
  accountant: 'hsp:accountant',
  guest: 'hsp:guest',
} as const

export const HSP_MANAGER_ROLES = [
  HSP_ROLES.admin,
  HSP_ROLES.owner,
  HSP_ROLES.propertyManager,
] as const
export const HSP_OPERATIONAL_ROLES = [
  ...HSP_MANAGER_ROLES,
  HSP_ROLES.reservations,
  HSP_ROLES.frontDesk,
] as const
export const HSP_FINANCE_ROLES = [
  HSP_ROLES.admin,
  HSP_ROLES.owner,
  HSP_ROLES.cashier,
  HSP_ROLES.accountant,
] as const
export const HSP_REPORT_ROLES = [
  HSP_ROLES.admin,
  HSP_ROLES.owner,
  HSP_ROLES.propertyManager,
  HSP_ROLES.accountant,
] as const

export const HSP_PERMISSIONS = {
  'property:read': [
    HSP_ROLES.admin,
    HSP_ROLES.owner,
    HSP_ROLES.propertyManager,
    HSP_ROLES.reservations,
    HSP_ROLES.frontDesk,
    HSP_ROLES.housekeeping,
    HSP_ROLES.cashier,
    HSP_ROLES.serviceDesk,
    HSP_ROLES.accountant,
  ],
  'property:create': [HSP_ROLES.admin, HSP_ROLES.owner],
  'property:update': [HSP_ROLES.admin, HSP_ROLES.owner, HSP_ROLES.propertyManager],
  'property:delete': [HSP_ROLES.admin, HSP_ROLES.owner],

  'room:read': [...HSP_OPERATIONAL_ROLES, HSP_ROLES.housekeeping, HSP_ROLES.serviceDesk],
  'room:update': HSP_MANAGER_ROLES,
  'room:status': [...HSP_OPERATIONAL_ROLES, HSP_ROLES.housekeeping],

  'rate:read': [...HSP_OPERATIONAL_ROLES, HSP_ROLES.cashier],
  'rate:create': HSP_MANAGER_ROLES,
  'rate:update': HSP_MANAGER_ROLES,
  'rate:delete': [HSP_ROLES.admin, HSP_ROLES.owner],

  'reservation:read': [...HSP_OPERATIONAL_ROLES, HSP_ROLES.cashier],
  'reservation:create': [...HSP_OPERATIONAL_ROLES],
  'reservation:update': [...HSP_OPERATIONAL_ROLES],
  'reservation:cancel': [...HSP_OPERATIONAL_ROLES],
  'reservation:checkin': [...HSP_OPERATIONAL_ROLES],
  'reservation:checkout': [...HSP_OPERATIONAL_ROLES],
  'reservation:assign': [...HSP_OPERATIONAL_ROLES],

  'guest:read': [
    ...HSP_OPERATIONAL_ROLES,
    HSP_ROLES.housekeeping,
    HSP_ROLES.serviceDesk,
    HSP_ROLES.cashier,
    HSP_ROLES.accountant,
  ],
  'guest:create': [...HSP_OPERATIONAL_ROLES],
  'guest:update': HSP_OPERATIONAL_ROLES,
  'guest:delete': HSP_MANAGER_ROLES,

  'folio:read': [...HSP_FINANCE_ROLES, ...HSP_OPERATIONAL_ROLES],
  'folio:create': [...HSP_FINANCE_ROLES, HSP_ROLES.frontDesk],
  'folio:update': HSP_FINANCE_ROLES,
  'folio:finalize': [HSP_ROLES.admin, HSP_ROLES.owner, HSP_ROLES.cashier],
  'folio:refund': [HSP_ROLES.admin, HSP_ROLES.owner, HSP_ROLES.cashier],

  'housekeeping:read': [...HSP_OPERATIONAL_ROLES, HSP_ROLES.housekeeping],
  'housekeeping:assign': [HSP_ROLES.admin, HSP_ROLES.propertyManager, HSP_ROLES.housekeeping],
  'housekeeping:complete': [...HSP_OPERATIONAL_ROLES, HSP_ROLES.housekeeping],
  'housekeeping:inspect': [HSP_ROLES.admin, HSP_ROLES.propertyManager, HSP_ROLES.housekeeping],

  'service:read': [...HSP_OPERATIONAL_ROLES, HSP_ROLES.serviceDesk],
  'service:create': [...HSP_OPERATIONAL_ROLES, HSP_ROLES.serviceDesk],
  'service:fulfill': [...HSP_OPERATIONAL_ROLES, HSP_ROLES.serviceDesk],
  'service:catalog:manage': HSP_MANAGER_ROLES,

  'parking:read': [...HSP_OPERATIONAL_ROLES],
  'parking:create': [...HSP_OPERATIONAL_ROLES],
  'parking:update': [...HSP_OPERATIONAL_ROLES],
  'parking:checkout': [...HSP_OPERATIONAL_ROLES],

  'partner:read': [...HSP_OPERATIONAL_ROLES, HSP_ROLES.accountant],
  'partner:create': HSP_MANAGER_ROLES,
  'partner:update': HSP_MANAGER_ROLES,
  'partner:delete': [HSP_ROLES.admin, HSP_ROLES.owner],

  'venue:read': [...HSP_OPERATIONAL_ROLES],
  'venue:create': HSP_MANAGER_ROLES,
  'venue:update': HSP_MANAGER_ROLES,
  'venue:reserve': [...HSP_OPERATIONAL_ROLES],
  'venue:cancel': [...HSP_OPERATIONAL_ROLES],

  'report:read': HSP_REPORT_ROLES,

  'settings:read': HSP_MANAGER_ROLES,
  'settings:update': [HSP_ROLES.admin, HSP_ROLES.owner],
} as const

export type HspPermission = keyof typeof HSP_PERMISSIONS

export function requirePermission(
  actor: AuthActor | null | undefined,
  permission: HspPermission,
): void {
  if (!actor) {
    throw new AuthorizationError('Authentication required', { reason: 'AUTH_REQUIRED' })
  }
  const allowed = HSP_PERMISSIONS[permission] as readonly string[]
  if (
    canAccess(actor, permission, { composeAdminRoles: COMPOSE_ADMIN_ROLES.hospitality }) ||
    allowed.some((r) => actor.roles.includes(r))
  ) {
    return
  }
  throw new AuthorizationError(`Missing permission: ${permission}`, {
    reason: 'FORBIDDEN',
    permission,
  })
}

/** True if the actor holds any manager role. */
export function isManager(actor: AuthActor): boolean {
  return (HSP_MANAGER_ROLES as readonly string[]).some((r) => actor.roles.includes(r))
}

/** True if the actor is a guest (scoped token). */
export function isGuest(actor: AuthActor): boolean {
  return actor.roles.includes(HSP_ROLES.guest)
}

/** True if the actor holds any operational role (can see property ops). */
export function isOperational(actor: AuthActor): boolean {
  return (HSP_OPERATIONAL_ROLES as readonly string[]).some((r) => actor.roles.includes(r))
}
