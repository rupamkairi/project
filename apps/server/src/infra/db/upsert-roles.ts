import { db } from '@db/client'
import { roles } from '@db/schema/identity'

export const DEFAULT_ORG_ID = 'org_platform_default'

export interface SystemRoleSeed {
  id: string
  name: string
  description: string
  permissions: string[]
  isDefault?: boolean
}

export async function upsertSystemRoles(orgId: string, rows: SystemRoleSeed[]): Promise<void> {
  const now = new Date()
  for (const row of rows) {
    await db
      .insert(roles)
      .values({
        id: row.id,
        organizationId: orgId,
        name: row.name,
        description: row.description,
        permissions: row.permissions,
        isSystem: true,
        isDefault: row.isDefault ?? false,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: { compose: row.name.split(':')[0] ?? 'platform' },
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: roles.id,
        set: {
          description: row.description,
          permissions: row.permissions,
          isSystem: true,
          updatedAt: now,
        },
      })
  }
}
