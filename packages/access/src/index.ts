export {
  GLOBAL_SUPERUSER_ROLE_KEYS,
  COMPOSE_ADMIN_ROLES,
  type GlobalSuperuserRoleKey,
  type AccessPrincipal,
  type AccessActorLike,
  type CanAccessOptions,
  type AccessPermissionNode,
  type AccessManifest,
} from './types'

export {
  principalFromActor,
  isGlobalSuperuser,
  grantMatches,
  grantsCover,
  canAccess,
  permissionsForRole,
  flattenPermissionIds,
  treeFromPermissionIds,
} from './match'
