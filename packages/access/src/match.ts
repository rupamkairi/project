import {
  GLOBAL_SUPERUSER_ROLE_KEYS,
  type AccessActorLike,
  type AccessPrincipal,
  type CanAccessOptions,
} from './types'

export function principalFromActor(actor: AccessActorLike | null | undefined): AccessPrincipal {
  if (!actor) return { roleKeys: [], permissions: [] }
  const roleKeys = actor.roleKeys ?? actor.roles ?? []
  return {
    roleKeys,
    permissions: actor.permissions ?? [],
  }
}

export function isGlobalSuperuser(
  roleKeys: readonly string[],
  permissions: readonly string[] = [],
): boolean {
  if (roleKeys.some((key) => (GLOBAL_SUPERUSER_ROLE_KEYS as readonly string[]).includes(key))) {
    return true
  }
  return [...roleKeys, ...permissions].some((grant) => grant === '*' || grant === '*:*')
}

/** True when `grant` covers `required`. Trailing `*` matches remaining segments. */
export function grantMatches(grant: string, required: string): boolean {
  if (grant === required) return true
  if (grant === '*' || grant === '*:*') return true

  const grantParts = grant.split(':')
  const requiredParts = required.split(':')
  let gi = 0
  let ri = 0

  while (gi < grantParts.length && ri < requiredParts.length) {
    const g = grantParts[gi]
    const r = requiredParts[ri]
    if (g === undefined || r === undefined) return false
    if (g === '*') {
      if (gi === grantParts.length - 1) return true
      gi += 1
      ri += 1
      continue
    }
    if (g !== r) return false
    gi += 1
    ri += 1
  }

  if (gi === grantParts.length && ri === requiredParts.length) return true
  if (gi === grantParts.length - 1 && grantParts[gi] === '*') return true
  return false
}

export function grantsCover(grants: readonly string[], required: string): boolean {
  return grants.some((grant) => grantMatches(grant, required))
}

export function canAccess(
  actor: AccessActorLike | AccessPrincipal | null | undefined,
  required: string,
  options: CanAccessOptions = {},
): boolean {
  const principal = principalFromActor(actor)
  if (isGlobalSuperuser(principal.roleKeys, principal.permissions)) return true

  const adminRoles = options.composeAdminRoles ?? []
  if (adminRoles.some((role) => principal.roleKeys.includes(role))) return true

  const grants = [...principal.permissions, ...principal.roleKeys]
  return grantsCover(grants, required)
}

export function permissionsForRole(
  matrix: Record<string, readonly string[]>,
  roleKey: string,
): string[] {
  return Object.entries(matrix)
    .filter(([, roles]) => roles.includes(roleKey))
    .map(([permission]) => permission)
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

export function treeFromPermissionIds(
  ids: readonly string[],
): import('./types').AccessPermissionNode[] {
  const groups = new Map<string, string[]>()
  for (const id of ids) {
    const moduleName = id.split(':')[0] ?? id
    const list = groups.get(moduleName) ?? []
    list.push(id)
    groups.set(moduleName, list)
  }
  return [...groups.entries()].map(([moduleName, perms]) => ({
    id: `group:${moduleName}`,
    label: titleCase(moduleName),
    children: perms.map((permission) => ({
      id: permission,
      label: permission,
    })),
  }))
}

export function flattenPermissionIds(nodes: { id?: string; children?: unknown[] }[]): string[] {
  const ids: string[] = []
  for (const node of nodes) {
    if (node.id) ids.push(node.id)
    if (Array.isArray(node.children)) {
      ids.push(...flattenPermissionIds(node.children as { id?: string; children?: unknown[] }[]))
    }
  }
  return ids
}
