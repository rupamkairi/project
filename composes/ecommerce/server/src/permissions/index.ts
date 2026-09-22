export const ECOMMERCE_PERMISSIONS = {
  admin: {
    products: { create: true, read: true, update: true, delete: true },
    orders: { create: true, read: true, update: true, delete: true },
    customers: { create: true, read: true, update: true, delete: true },
    returns: { create: true, read: true, update: true, delete: true },
    analytics: { read: true },
    settings: { create: true, read: true, update: true, delete: true },
    regions: { create: true, read: true, update: true, delete: true },
    shippingOptions: { create: true, read: true, update: true, delete: true },
    taxRegions: { create: true, read: true, update: true, delete: true },
  },
  manager: {
    products: { create: true, read: true, update: true, delete: true },
    orders: { create: true, read: true, update: true, delete: true },
    customers: { create: true, read: true, update: true, delete: true },
    returns: { create: true, read: true, update: true, delete: true },
    analytics: { read: true },
    settings: { read: false },
    regions: { read: true },
    shippingOptions: { create: true, read: true, update: true, delete: true },
    taxRegions: { read: true },
  },
  fulfillment: {
    products: { read: true },
    orders: { read: true, update: true },
    customers: {},
    returns: { read: true, update: true },
    analytics: {},
    settings: {},
    regions: {},
    shippingOptions: { read: true },
    taxRegions: {},
  },
  support: {
    products: { read: true },
    orders: { read: true, update: true },
    customers: { read: true },
    returns: { create: true, read: true, update: true },
    analytics: {},
    settings: {},
    regions: {},
    shippingOptions: { read: true },
    taxRegions: {},
  },
  customer: {
    orders: { read: true },
    returns: { create: true, read: true },
    account: { read: true, update: true },
    addresses: { create: true, read: true, update: true, delete: true },
  },
} as const

import { canAccess, COMPOSE_ADMIN_ROLES } from '@projectx/access'
import type { AccessActorLike } from '@projectx/access'
import { AuthorizationError } from '@core'

export type EcommerceRole = keyof typeof ECOMMERCE_PERMISSIONS
export type EcommerceResource = string
export type EcommerceAction = 'create' | 'read' | 'update' | 'delete'

export function hasPermission(
  actor: AccessActorLike | EcommerceRole,
  resource: EcommerceResource,
  action: EcommerceAction,
): boolean {
  if (typeof actor === 'string') {
    const rolePermissions = ECOMMERCE_PERMISSIONS[actor]
    if (!rolePermissions) return false
    const resourcePermissions = (rolePermissions as Record<string, Record<string, boolean>>)[
      resource
    ]
    if (!resourcePermissions) return false
    return resourcePermissions[action] === true
  }
  return canAccess(actor, `${resource}:${action}`, {
    composeAdminRoles: COMPOSE_ADMIN_ROLES.ecommerce,
  })
}

export function requireEcommercePermission(
  actor: AccessActorLike | null | undefined,
  resource: EcommerceResource,
  action: EcommerceAction,
): void {
  if (!actor) {
    throw new AuthorizationError('Authentication required', { reason: 'AUTH_REQUIRED' })
  }
  if (!hasPermission(actor, resource, action)) {
    throw new AuthorizationError(`Missing permission: ${resource}:${action}`, {
      reason: 'FORBIDDEN',
      permission: `${resource}:${action}`,
    })
  }
}
