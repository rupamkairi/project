import type { QueryHandler } from '@core'
import { db } from '@db/client'
import { actors, actorRoles, apiKeys, roles, sessions } from '@db/schema/identity'
import type { Actor, ApiKey, Role, Session } from '@db/schema/identity'
import { eq, and, isNull, gt, inArray } from 'drizzle-orm'
import { canAccess } from '@projectx/access'

// ---------------------------------------------------------------------------
// identity.getActor
// ---------------------------------------------------------------------------

export interface GetActorParams {
  actorId: string
}

export const getActorHandler: QueryHandler<GetActorParams, Actor | null> = async (query) => {
  const { actorId } = query.params
  const orgId = query.orgId

  const [actor] = await db
    .select()
    .from(actors)
    .where(and(eq(actors.id, actorId), eq(actors.organizationId, orgId), isNull(actors.deletedAt)))
    .limit(1)

  return actor ?? null
}

// ---------------------------------------------------------------------------
// identity.listActors
// ---------------------------------------------------------------------------

export interface ListActorsParams {
  status?: string
  type?: string
  limit?: number
  offset?: number
}

export interface ListActorsResult {
  items: Actor[]
  total: number
}

export const listActorsHandler: QueryHandler<ListActorsParams, ListActorsResult> = async (
  query,
) => {
  const { status, type, limit = 50, offset = 0 } = query.params
  const orgId = query.orgId

  const conditions = [eq(actors.organizationId, orgId), isNull(actors.deletedAt)]
  if (status)
    conditions.push(eq(actors.status, status as 'pending' | 'active' | 'suspended' | 'deleted'))
  if (type) conditions.push(eq(actors.type, type as 'human' | 'system' | 'api_key'))

  const items = await db
    .select()
    .from(actors)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)

  return { items, total: items.length }
}

// ---------------------------------------------------------------------------
// identity.getSession
// ---------------------------------------------------------------------------

export interface GetSessionParams {
  sessionId: string
}

export const getSessionHandler: QueryHandler<GetSessionParams, Session | null> = async (query) => {
  const { sessionId } = query.params

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1)

  return session ?? null
}

// ---------------------------------------------------------------------------
// identity.resolveSession — validates !revokedAt, !expired
// ---------------------------------------------------------------------------

export interface ResolveSessionParams {
  sessionId: string
}

export const resolveSessionHandler: QueryHandler<ResolveSessionParams, Session | null> = async (
  query,
) => {
  const { sessionId } = query.params
  const now = new Date()

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
    .limit(1)

  return session ?? null
}

// ---------------------------------------------------------------------------
// identity.resolveAPIKey
// ---------------------------------------------------------------------------

export interface ResolveAPIKeyParams {
  keyHash: string
}

export const resolveAPIKeyHandler: QueryHandler<ResolveAPIKeyParams, ApiKey | null> = async (
  query,
) => {
  const { keyHash } = query.params
  const now = new Date()

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt), isNull(apiKeys.deletedAt)))
    .limit(1)

  if (!key) return null
  if (key.expiresAt && key.expiresAt < now) return null

  return key
}

async function loadActorAccess(actorId: string): Promise<{
  roleKeys: string[]
  permissions: string[]
  roles: { id: string; name: string; description: string | null }[]
}> {
  const assignments = await db
    .select({
      roleId: roles.id,
      name: roles.name,
      description: roles.description,
      permissions: roles.permissions,
    })
    .from(actorRoles)
    .innerJoin(roles, eq(actorRoles.roleId, roles.id))
    .where(and(eq(actorRoles.actorId, actorId), isNull(roles.deletedAt)))

  const roleKeys = assignments.map((row) => row.name)
  const perms = new Set<string>()
  for (const row of assignments) {
    const p = row.permissions as string[]
    if (Array.isArray(p)) p.forEach((x) => perms.add(x))
  }

  return {
    roleKeys,
    permissions: Array.from(perms),
    roles: assignments.map((row) => ({
      id: row.roleId,
      name: row.name,
      description: row.description,
    })),
  }
}

// ---------------------------------------------------------------------------
// identity.getPermissions — flat permission strings for actor via roles
// ---------------------------------------------------------------------------

export interface GetPermissionsParams {
  actorId: string
}

export const getPermissionsHandler: QueryHandler<GetPermissionsParams, string[]> = async (
  query,
) => {
  const access = await loadActorAccess(query.params.actorId)
  return access.permissions
}

// ---------------------------------------------------------------------------
// identity.getActorAccess — role keys + flattened permission grants
// ---------------------------------------------------------------------------

export interface GetActorAccessParams {
  actorId: string
}

export interface ActorAccess {
  roleKeys: string[]
  permissions: string[]
  roles: { id: string; name: string; description: string | null }[]
}

export const getActorAccessHandler: QueryHandler<GetActorAccessParams, ActorAccess> = async (
  query,
) => {
  return loadActorAccess(query.params.actorId)
}

// ---------------------------------------------------------------------------
// identity.hasPermission
// ---------------------------------------------------------------------------

export interface HasPermissionParams {
  actorId: string
  permission: string
}

export const hasPermissionHandler: QueryHandler<HasPermissionParams, boolean> = async (query) => {
  const { actorId, permission } = query.params
  const access = await loadActorAccess(actorId)
  return canAccess(access, permission)
}

// ---------------------------------------------------------------------------
// identity.listRoles
// ---------------------------------------------------------------------------

export interface ListRolesParams {
  isSystem?: boolean
}

export const listRolesHandler: QueryHandler<ListRolesParams, Role[]> = async (query) => {
  const { isSystem } = query.params
  const orgId = query.orgId

  const conditions = [eq(roles.organizationId, orgId), isNull(roles.deletedAt)]
  if (typeof isSystem === 'boolean') conditions.push(eq(roles.isSystem, isSystem))

  return db
    .select()
    .from(roles)
    .where(and(...conditions))
}
