import type { AccessManifest } from '@projectx/access'
import { COMPOSE_ADMIN_ROLES, treeFromPermissionIds } from '@projectx/access'
import { CRM_PERMISSIONS } from '../permissions'

export const crmAccessManifest: AccessManifest = {
  id: 'crm',
  label: 'CRM',
  adminRoles: COMPOSE_ADMIN_ROLES.crm,
  permissions: treeFromPermissionIds(Object.keys(CRM_PERMISSIONS)),
}
