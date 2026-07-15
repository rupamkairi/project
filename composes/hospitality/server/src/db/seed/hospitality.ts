import { db } from '@db/client'
import { roles } from '@db/schema/identity'
import { seedPipeline } from '@db/seed'

export const HSP_DEFAULT_ORG_ID = 'org_platform_default'

const HSP_ROLES_SEED = [
  {
    id: 'plt_role_hsp_admin',
    name: 'hsp:admin',
    description: 'Hospitality Administrator — full access across all properties',
    permissions: ['*:*'],
  },
  {
    id: 'plt_role_hsp_owner',
    name: 'hsp:owner',
    description: 'Property Owner — property management, settings, reports',
    permissions: ['*:read', '*:create', '*:update'],
  },
  {
    id: 'plt_role_hsp_property_manager',
    name: 'hsp:property-manager',
    description: 'Property Manager — day-to-day operations, staff management',
    permissions: ['*:read', '*:create', '*:update'],
  },
  {
    id: 'plt_role_hsp_reservations',
    name: 'hsp:reservations',
    description: 'Reservations Agent — manage bookings, holds, room assignments',
    permissions: ['*:read', 'reservation:*', 'guest:read', 'guest:create'],
  },
  {
    id: 'plt_role_hsp_front_desk',
    name: 'hsp:front-desk',
    description: 'Front Desk — check-in/out, folios, guest services',
    permissions: ['*:read', 'reservation:*', 'folio:*', 'guest:*', 'service:*', 'parking:*'],
  },
  {
    id: 'plt_role_hsp_housekeeping',
    name: 'hsp:housekeeping',
    description: 'Housekeeping — room cleaning, inspection, maintenance notes',
    permissions: ['*:read', 'room:status', 'housekeeping:*'],
  },
  {
    id: 'plt_role_hsp_cashier',
    name: 'hsp:cashier',
    description: 'Cashier — folio management, payments, refunds, invoices',
    permissions: ['*:read', 'folio:*', 'guest:read'],
  },
  {
    id: 'plt_role_hsp_service_desk',
    name: 'hsp:service-desk',
    description: 'Service Desk — guest services, requests, partners',
    permissions: ['*:read', 'service:*', 'guest:read', 'parking:read'],
  },
  {
    id: 'plt_role_hsp_accountant',
    name: 'hsp:accountant',
    description: 'Accountant — reports, financials, partner charges, budgets',
    permissions: ['*:read', 'report:*', 'folio:read', 'partner:read'],
  },
  {
    id: 'plt_role_hsp_guest',
    name: 'hsp:guest',
    description: 'Guest — scoped access to own stay, folio, service requests',
    permissions: [],
  },
]

const RESERVATION_STAGES = [
  { name: 'Hold' },
  { name: 'Confirmed' },
  { name: 'Checked In' },
  { name: 'In House' },
  { name: 'Checked Out' },
  { name: 'Cancelled' },
  { name: 'No Show' },
]

const HK_STAGES = [
  { name: 'Queued' },
  { name: 'Assigned' },
  { name: 'In Progress' },
  { name: 'Completed' },
  { name: 'Inspected' },
]

const SERVICE_STAGES = [
  { name: 'Requested' },
  { name: 'Assigned' },
  { name: 'In Progress' },
  { name: 'Completed' },
]

const VENUE_STAGES = [
  { name: 'Tentative' },
  { name: 'Confirmed' },
  { name: 'Deposit Received' },
  { name: 'In Progress' },
  { name: 'Completed' },
  { name: 'Cancelled' },
]

export interface SeedHspResult {
  orgId: string
  roles: string[]
  reservationPipeline: { pipelineId: string; stageIds: Record<string, string> }
  housekeepingPipeline: { pipelineId: string; stageIds: Record<string, string> }
  servicePipeline: { pipelineId: string; stageIds: Record<string, string> }
  venuePipeline: { pipelineId: string; stageIds: Record<string, string> }
}

export async function seedHospitality(orgId: string = HSP_DEFAULT_ORG_ID): Promise<SeedHspResult> {
  console.log('Seeding Hospitality data...')

  const now = new Date()
  await db
    .insert(roles)
    .values(
      HSP_ROLES_SEED.map((r) => ({
        ...r,
        organizationId: orgId,
        isSystem: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
        version: 1,
        meta: {},
        deletedAt: null,
      })),
    )
    .onConflictDoNothing()
  console.log('✓ Seeded Hospitality roles:', HSP_ROLES_SEED.map((r) => r.name).join(', '))

  const reservationPipeline = await seedPipeline(orgId, 'hsp.reservation', RESERVATION_STAGES, {
    name: 'Reservation Pipeline',
  })
  console.log('✓ Seeded hsp.reservation pipeline:', reservationPipeline.pipelineId)

  const housekeepingPipeline = await seedPipeline(orgId, 'hsp.housekeeping', HK_STAGES, {
    name: 'Housekeeping Pipeline',
  })
  console.log('✓ Seeded hsp.housekeeping pipeline:', housekeepingPipeline.pipelineId)

  const servicePipeline = await seedPipeline(orgId, 'hsp.service', SERVICE_STAGES, {
    name: 'Service Pipeline',
  })
  console.log('✓ Seeded hsp.service pipeline:', servicePipeline.pipelineId)

  const venuePipeline = await seedPipeline(orgId, 'hsp.venue', VENUE_STAGES, {
    name: 'Venue Pipeline',
  })
  console.log('✓ Seeded hsp.venue pipeline:', venuePipeline.pipelineId)

  console.log('Hospitality seed complete.')
  return {
    orgId,
    roles: HSP_ROLES_SEED.map((r) => r.name),
    reservationPipeline,
    housekeepingPipeline,
    servicePipeline,
    venuePipeline,
  }
}
