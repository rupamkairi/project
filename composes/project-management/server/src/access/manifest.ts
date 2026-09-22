import type { AccessManifest } from '@projectx/access'
import { COMPOSE_ADMIN_ROLES, treeFromPermissionIds } from '@projectx/access'
import { PJM_PERMISSIONS } from '../permissions'

export const projectManagementAccessManifest: AccessManifest = {
  id: 'project-management',
  label: 'Project Management',
  adminRoles: COMPOSE_ADMIN_ROLES['project-management'],
  permissions: treeFromPermissionIds(Object.keys(PJM_PERMISSIONS)),
}
