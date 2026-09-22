import type { AccessManifest } from '@projectx/access'
import { COMPOSE_ADMIN_ROLES, treeFromPermissionIds } from '@projectx/access'
import { HSP_PERMISSIONS } from '../permissions'

export const hospitalityAccessManifest: AccessManifest = {
  id: 'hospitality',
  label: 'Hospitality',
  adminRoles: COMPOSE_ADMIN_ROLES.hospitality,
  permissions: treeFromPermissionIds(Object.keys(HSP_PERMISSIONS)),
}
