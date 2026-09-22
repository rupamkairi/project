import { db } from './client'
import { roles } from './schema/identity'
import { eq, and, isNull } from 'drizzle-orm'
import { seedPlatform } from '@projectx/platform-server'
import { seedHospitality } from '@projectx/hospitality-server'
import { seedCrm } from '@projectx/crm-server'
import { seedProjectManagement } from '@projectx/project-management-server'
import { seedLms } from '@projectx/lms-server'
import { seedEcommerceRoles } from '@projectx/ecommerce-server'
import { seedErpRoles } from '@projectx/erp-server'
import { seedWorkplaceRoles } from '@projectx/workplace-server'
import { seedRestaurantRoles } from '@projectx/restaurant-server'

const ORG_ID = 'org_platform_default'

/**
 * Idempotent upsert of the `platform-developer` system role.
 * seedPlatform() skips entirely on already-seeded DBs, so freshly added
 * system roles need their own ensure step here.
 */
async function ensurePlatformDeveloper(orgId: string = ORG_ID) {
  const now = new Date()
  await db
    .insert(roles)
    .values({
      id: 'plt_role_platform-developer',
      organizationId: orgId,
      name: 'platform-developer',
      description: 'Platform Developer - Full system access for development and debugging',
      permissions: ['*:*'],
      isSystem: true,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      version: 1,
      meta: {},
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: roles.id,
      set: {
        description: 'Platform Developer - Full system access for development and debugging',
        permissions: ['*:*'],
        updatedAt: now,
      },
    })
  console.log('✓ Ensured platform-developer role')
}

async function seedEcommerceRolesIdempotent(orgId: string) {
  const existing = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.organizationId, orgId), isNull(roles.deletedAt)))
    .limit(1000)
  const hasEcoRoles = existing.some((r) => r.id.startsWith('eco_role_'))
  if (hasEcoRoles) {
    console.log('Ecommerce roles already seeded, skipping...')
    return
  }
  await seedEcommerceRoles(orgId)
}

/**
 * Orchestrates identity role seeds across all composes.
 * Must run after seedPlatform() (creates org_platform_default).
 * Only seeds identity `roles` — compose data seeds with mismatched default
 * orgs (erp/workplace `org_default`, ecommerce `org_platform`) are intentionally
 * left out until they accept an explicit orgId.
 */
export async function seedAccess(orgId: string = ORG_ID) {
  console.log('Seeding cross-compose access roles...')

  await seedPlatform()
  await ensurePlatformDeveloper(orgId)

  await seedHospitality(orgId)
  await seedCrm(orgId)
  await seedProjectManagement(orgId)
  await seedLms(orgId)
  await seedEcommerceRolesIdempotent(orgId)
  await seedErpRoles(orgId)
  await seedWorkplaceRoles(orgId)
  await seedRestaurantRoles(orgId)

  console.log('✓ Access role seeding complete')
}

if (import.meta.path === Bun.main) {
  seedAccess().catch(console.error)
}
