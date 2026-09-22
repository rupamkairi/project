import type { AccessManifest } from '@projectx/access'
import { COMPOSE_ADMIN_ROLES, treeFromPermissionIds } from '@projectx/access'

export const PLATFORM_PERMISSIONS = [
  'actor:create',
  'actor:read',
  'actor:update',
  'actor:delete',
  'role:read',
  'role:write',
  'role:assign',
  'session:read',
  'session:revoke',
  'access:catalog',
  'notification.template:create',
  'notification.template:read',
  'notification.template:update',
  'notification.trigger:read',
  'notification.log:read',
  'settings:read',
  'settings:write',
  'invite:read',
  'invite:write',
] as const

export const platformAccessManifest: AccessManifest = {
  id: 'platform',
  label: 'Platform',
  adminRoles: COMPOSE_ADMIN_ROLES.platform,
  permissions: treeFromPermissionIds([...PLATFORM_PERMISSIONS]),
}
