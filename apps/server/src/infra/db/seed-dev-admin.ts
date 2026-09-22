import { db } from './client'
import { actors, actorRoles, roles } from './schema/identity'
import { eq, and, isNull } from 'drizzle-orm'

const ORG_ID = 'org_platform_default'
const ACTOR_ID = 'actor_dev_admin'
const EMAIL = 'developer@platform.local'
const PASSWORD = 'dev123'

async function seedDevAdmin() {
  console.log('Upserting dev admin actor...')

  const passwordHash = await Bun.password.hash(PASSWORD, { algorithm: 'bcrypt' })

  await db
    .insert(actors)
    .values({
      id: ACTOR_ID,
      organizationId: ORG_ID,
      email: EMAIL,
      passwordHash,
      type: 'human',
      status: 'active',
      firstName: 'Dev',
      lastName: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      deletedAt: null,
      meta: {},
    })
    .onConflictDoUpdate({
      target: actors.id,
      set: { email: EMAIL, passwordHash, updatedAt: new Date() },
    })

  console.log('✓ Dev admin actor upserted')

  const existingRoles = await db
    .select()
    .from(roles)
    .where(and(eq(roles.organizationId, ORG_ID), isNull(roles.deletedAt)))
    .limit(1000)

  for (const roleName of ['platform-admin', 'platform-developer']) {
    const role = existingRoles.find((r) => r.name === roleName)
    if (role) {
      await db
        .insert(actorRoles)
        .values({
          actorId: ACTOR_ID,
          roleId: role.id,
          assignedAt: new Date(),
          assignedBy: ACTOR_ID,
        })
        .onConflictDoNothing()
      console.log(`✓ ${roleName} role assigned`)
    } else {
      console.warn(`${roleName} role not found — run db:seed first`)
    }
  }

  console.log(`\nDev admin ready:\n  Email:    ${EMAIL}\n  Password: ${PASSWORD}\n`)
}

seedDevAdmin().catch(console.error)
