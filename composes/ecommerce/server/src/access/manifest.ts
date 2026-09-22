import type { AccessManifest } from '@projectx/access'
import { COMPOSE_ADMIN_ROLES, treeFromPermissionIds } from '@projectx/access'
import { ECOMMERCE_PERMISSIONS } from '../permissions'

const ids = new Set<string>()
for (const role of Object.values(ECOMMERCE_PERMISSIONS)) {
  for (const [resource, actions] of Object.entries(role)) {
    for (const [action, allowed] of Object.entries(actions as Record<string, boolean>)) {
      if (allowed) ids.add(`${resource}:${action}`)
    }
  }
}

export const ecommerceAccessManifest: AccessManifest = {
  id: 'ecommerce',
  label: 'Ecommerce',
  adminRoles: COMPOSE_ADMIN_ROLES.ecommerce,
  permissions: treeFromPermissionIds([...ids]),
}
