import { db } from '@db/client'
import { roles } from '@db/schema/identity'
import { grantsForErpRole, ERP_ROLES } from '../../permissions/matrix'

const ORG_ID = 'org_platform_default'

export async function seedErpRoles(orgId: string = ORG_ID) {
  const now = new Date()
  const rows = Object.values(ERP_ROLES).map((name) => ({
    id: `plt_role_${name.replace(/:/g, '_')}`,
    name,
    description:
      name === ERP_ROLES.ADMIN
        ? 'ERP Administrator — full access across procurement, inventory, finance, and sales'
        : `ERP role ${name}`,
    permissions: grantsForErpRole(name),
    organizationId: orgId,
    isSystem: true,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
    version: 1,
    meta: { compose: 'erp' },
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
  console.log('✓ Seeded ERP roles:', rows.map((r) => r.name).join(', '))
}
