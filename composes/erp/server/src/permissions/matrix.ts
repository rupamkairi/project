import { canAccess, COMPOSE_ADMIN_ROLES, permissionsForRole } from '@projectx/access'
import type { AccessActorLike } from '@projectx/access'
import { AuthorizationError } from '@core'

export const ERP_ROLES = {
  ADMIN: 'erp:admin',
  PROCUREMENT: 'erp:procurement-officer',
  WAREHOUSE: 'erp:warehouse-manager',
  FINANCE: 'erp:finance-controller',
  OPERATIONS: 'erp:operations-manager',
  VENDOR: 'erp:vendor',
  AUDITOR: 'erp:auditor',
} as const

export type ErpRole = (typeof ERP_ROLES)[keyof typeof ERP_ROLES]

export function hasPermission(
  actor: AccessActorLike | null | undefined,
  permission: string,
): boolean {
  if (!actor) return false
  if (canAccess(actor, permission, { composeAdminRoles: COMPOSE_ADMIN_ROLES.erp })) return true
  const allowed = PERMISSION_MAP[permission]
  if (!allowed) return canAccess(actor, permission)
  const roleKeys = actor.roleKeys ?? actor.roles ?? []
  return allowed.some((role) => roleKeys.includes(role))
}

export function requirePermission(
  actor: AccessActorLike | null | undefined,
  permission: string,
): void {
  if (!actor) {
    throw new AuthorizationError('Authentication required', { reason: 'AUTH_REQUIRED' })
  }
  if (!hasPermission(actor, permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`, {
      reason: 'FORBIDDEN',
      permission,
    })
  }
}

export const PERMISSION_MAP: Record<string, ErpRole[]> = {
  'erp:vendor:read': [
    'erp:admin',
    'erp:procurement-officer',
    'erp:warehouse-manager',
    'erp:finance-controller',
    'erp:operations-manager',
    'erp:auditor',
  ],
  'erp:vendor:create': ['erp:admin', 'erp:procurement-officer'],
  'erp:vendor:approve': ['erp:admin', 'erp:finance-controller'],
  'erp:purchase-req:create': ['erp:admin', 'erp:procurement-officer', 'erp:operations-manager'],
  'erp:purchase-req:approve': ['erp:admin', 'erp:finance-controller', 'erp:operations-manager'],
  'erp:purchase-order:create': ['erp:admin', 'erp:procurement-officer'],
  'erp:purchase-order:approve': ['erp:admin', 'erp:finance-controller'],
  'erp:goods-receipt:create': ['erp:admin', 'erp:warehouse-manager'],
  'erp:goods-receipt:approve': ['erp:admin', 'erp:procurement-officer', 'erp:warehouse-manager'],
  'erp:invoice:create': [
    'erp:admin',
    'erp:procurement-officer',
    'erp:finance-controller',
    'erp:vendor',
  ],
  'erp:invoice:approve': ['erp:admin', 'erp:finance-controller'],
  'erp:invoice:pay': ['erp:admin', 'erp:finance-controller'],
  'erp:inventory:read': [
    'erp:admin',
    'erp:procurement-officer',
    'erp:warehouse-manager',
    'erp:finance-controller',
    'erp:operations-manager',
    'erp:auditor',
  ],
  'erp:inventory:transfer': ['erp:admin', 'erp:warehouse-manager'],
  'erp:ledger:read': ['erp:admin', 'erp:finance-controller', 'erp:auditor'],
  'erp:ledger:post': ['erp:admin', 'erp:finance-controller'],
  'erp:ledger:close-period': ['erp:admin', 'erp:finance-controller'],
  'erp:sales-order:create': ['erp:admin', 'erp:operations-manager'],
  'erp:sales-order:approve': ['erp:admin', 'erp:finance-controller'],
}

export function grantsForErpRole(role: ErpRole): string[] {
  if (role === ERP_ROLES.ADMIN) return ['erp:*']
  return permissionsForRole(PERMISSION_MAP, role)
}
