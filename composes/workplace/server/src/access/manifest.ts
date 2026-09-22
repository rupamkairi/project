import type { AccessManifest } from '@projectx/access'
import { COMPOSE_ADMIN_ROLES, treeFromPermissionIds } from '@projectx/access'
import { PERMISSION_MAP } from '../permissions/matrix'

export const workplaceAccessManifest: AccessManifest = {
  id: 'workplace',
  label: 'Workplace',
  adminRoles: COMPOSE_ADMIN_ROLES.workplace,
  permissions: treeFromPermissionIds(Object.keys(PERMISSION_MAP)),
}
