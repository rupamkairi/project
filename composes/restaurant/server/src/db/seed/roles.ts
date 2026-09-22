import { db } from '@db/client'
import { roles } from '@db/schema/identity'

const ORG_ID = 'org_platform_default'

export const REST_ROLES_SEED = [
  {
    id: 'plt_role_rest_admin',
    name: 'rest:admin',
    description: 'Restaurant Administrator — full restaurant access',
    permissions: ['restaurant:*'],
  },
  {
    id: 'plt_role_rest_owner',
    name: 'rest:owner',
    description: 'Restaurant Owner',
    permissions: [
      'restaurant:read:*',
      'restaurant:manage:outlet',
      'restaurant:manage:staff',
      'restaurant:manage:menu',
      'restaurant:manage:billing',
    ],
  },
  {
    id: 'plt_role_rest_outlet_manager',
    name: 'rest:outlet-manager',
    description: 'Outlet Manager',
    permissions: [
      'restaurant:read:*',
      'restaurant:manage:outlet',
      'restaurant:manage:staff',
      'restaurant:manage:billing',
    ],
  },
  {
    id: 'plt_role_rest_cashier',
    name: 'rest:cashier',
    description: 'Cashier',
    permissions: [
      'restaurant:read:orders',
      'restaurant:manage:billing',
      'restaurant:manage:shifts',
    ],
  },
  {
    id: 'plt_role_rest_waiter',
    name: 'rest:waiter',
    description: 'Waiter',
    permissions: ['restaurant:read:orders', 'restaurant:create:orders', 'restaurant:manage:tables'],
  },
  {
    id: 'plt_role_rest_kitchen_manager',
    name: 'rest:kitchen-manager',
    description: 'Kitchen Manager',
    permissions: ['restaurant:read:kds', 'restaurant:manage:kds', 'restaurant:manage:inventory'],
  },
  {
    id: 'plt_role_rest_kitchen',
    name: 'rest:kitchen',
    description: 'Kitchen Staff',
    permissions: ['restaurant:read:kds', 'restaurant:manage:kds'],
  },
  {
    id: 'plt_role_rest_inventory',
    name: 'rest:inventory',
    description: 'Inventory Manager',
    permissions: [
      'restaurant:read:inventory',
      'restaurant:manage:inventory',
      'restaurant:manage:recipes',
    ],
  },
  {
    id: 'plt_role_rest_viewer',
    name: 'rest:viewer',
    description: 'Viewer',
    permissions: ['restaurant:read:*'],
  },
]

export async function seedRestaurantRoles(orgId: string = ORG_ID) {
  const now = new Date()
  for (const row of REST_ROLES_SEED) {
    await db
      .insert(roles)
      .values({
        ...row,
        organizationId: orgId,
        isSystem: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: { compose: 'restaurant' },
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: roles.id,
        set: {
          description: row.description,
          permissions: row.permissions,
          updatedAt: now,
        },
      })
  }
  console.log('✓ Seeded Restaurant roles:', REST_ROLES_SEED.map((r) => r.name).join(', '))
}
