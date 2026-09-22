export const GLOBAL_SUPERUSER_ROLE_KEYS = ['platform-admin', 'platform-developer'] as const

export type GlobalSuperuserRoleKey = (typeof GLOBAL_SUPERUSER_ROLE_KEYS)[number]

export const COMPOSE_ADMIN_ROLES = {
  platform: ['platform-admin', 'platform-developer'],
  hospitality: ['hsp:admin'],
  crm: ['crm:admin'],
  'project-management': ['pjm:admin'],
  erp: ['erp:admin'],
  workplace: ['workplace:admin'],
  ecommerce: ['eco:admin'],
  lms: ['lms-admin', 'lms:admin'],
  restaurant: ['rest:admin'],
} as const

export interface AccessPrincipal {
  roleKeys: string[]
  permissions: string[]
}

export interface AccessActorLike {
  roles?: string[]
  roleKeys?: string[]
  permissions?: string[]
}

export interface CanAccessOptions {
  composeAdminRoles?: readonly string[]
}

export interface AccessPermissionNode {
  id: string
  label: string
  description?: string
  children?: AccessPermissionNode[]
}

export interface AccessManifest {
  id: string
  label: string
  adminRoles: readonly string[]
  permissions: AccessPermissionNode[]
}
