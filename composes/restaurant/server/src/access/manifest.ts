import type { AccessManifest } from '@projectx/access'
import { COMPOSE_ADMIN_ROLES, treeFromPermissionIds } from '@projectx/access'

export const RESTAURANT_PERMISSIONS = [
  'restaurant:read:*',
  'restaurant:read:orders',
  'restaurant:read:kds',
  'restaurant:read:inventory',
  'restaurant:create:orders',
  'restaurant:manage:outlet',
  'restaurant:manage:staff',
  'restaurant:manage:menu',
  'restaurant:manage:billing',
  'restaurant:manage:shifts',
  'restaurant:manage:tables',
  'restaurant:manage:kds',
  'restaurant:manage:inventory',
  'restaurant:manage:recipes',
  'restaurant:*',
] as const

export const restaurantAccessManifest: AccessManifest = {
  id: 'restaurant',
  label: 'Restaurant',
  adminRoles: COMPOSE_ADMIN_ROLES.restaurant,
  permissions: treeFromPermissionIds([...RESTAURANT_PERMISSIONS]),
}
