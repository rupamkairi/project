import type { AccessManifest } from '@projectx/access'
import { COMPOSE_ADMIN_ROLES, treeFromPermissionIds } from '@projectx/access'
import { LMS_PERMISSIONS } from '../permissions'

export const lmsAccessManifest: AccessManifest = {
  id: 'lms',
  label: 'LMS',
  adminRoles: COMPOSE_ADMIN_ROLES.lms,
  permissions: treeFromPermissionIds([...LMS_PERMISSIONS]),
}
