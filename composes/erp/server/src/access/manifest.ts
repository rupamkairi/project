import type { AccessManifest } from '@projectx/access'
import { COMPOSE_ADMIN_ROLES, treeFromPermissionIds } from '@projectx/access'
import { PERMISSION_MAP } from '../permissions/matrix'

export const erpAccessManifest: AccessManifest = {
  id: 'erp',
  label: 'ERP',
  adminRoles: COMPOSE_ADMIN_ROLES.erp,
  permissions: treeFromPermissionIds(Object.keys(PERMISSION_MAP)),
}
