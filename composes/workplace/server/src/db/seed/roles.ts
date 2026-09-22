import { db } from '@db/client'
import { roles } from '@db/schema/identity'
import { grantsForWorkplaceRole, WORKPLACE_ROLES } from '../../permissions/matrix'

const ORG_ID = 'org_platform_default'

export async function seedWorkplaceRoles(orgId: string = ORG_ID) {
  const now = new Date()
  const rows = Object.values(WORKPLACE_ROLES).map((name) => ({
    id: `plt_role_${name.replace(/:/g, '_')}`,
    name,
    description:
      name === WORKPLACE_ROLES.ADMIN
        ? 'Workplace Administrator — full HR, payroll, and office access'
        : `Workplace role ${name}`,
    permissions: grantsForWorkplaceRole(name),
    organizationId: orgId,
    isSystem: true,
    isDefault: name === WORKPLACE_ROLES.EMPLOYEE,
    createdAt: now,
    updatedAt: now,
    version: 1,
    meta: { compose: 'workplace' },
    deletedAt: null,
  }))

  for (const row of rows) {
    await db
      .insert(roles)
      .values(row)
      .onConflictDoUpdate({
        target: roles.id,
        set: {
          description: row.description,
          permissions: row.permissions,
          updatedAt: now,
        },
      })
  }
  console.log('✓ Seeded Workplace roles:', rows.map((r) => r.name).join(', '))
}
