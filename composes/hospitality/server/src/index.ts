import Elysia from 'elysia'
import type { Mediator } from '@core'
import { createPropertiesRoutes } from './routes/properties'
import { createRoomsRoutes } from './routes/rooms'
import { createRatesRoutes } from './routes/rates'
import { createReservationsRoutes } from './routes/reservations'
import { createGuestsRoutes } from './routes/guests'
import { createFoliosRoutes } from './routes/folios'
import { createHousekeepingRoutes } from './routes/housekeeping'
import { createServicesRoutes } from './routes/services'
import { createParkingRoutes } from './routes/parking'
import { createPartnersRoutes } from './routes/partners'
import { createVenuesRoutes } from './routes/venues'
import { createReportsRoutes } from './routes/reports'

export function createHospitalityCompose(mediator: Mediator) {
  return new Elysia({ prefix: '/hospitality' })
    .use(createPropertiesRoutes(mediator))
    .use(createRoomsRoutes(mediator))
    .use(createRatesRoutes(mediator))
    .use(createReservationsRoutes(mediator))
    .use(createGuestsRoutes(mediator))
    .use(createFoliosRoutes(mediator))
    .use(createHousekeepingRoutes(mediator))
    .use(createServicesRoutes(mediator))
    .use(createParkingRoutes(mediator))
    .use(createPartnersRoutes(mediator))
    .use(createVenuesRoutes(mediator))
    .use(createReportsRoutes(mediator))
}

export { seedHospitality } from './db/seed/hospitality'
export * from './db/schema/hospitality'
export { registerHospitalityHooks } from './hooks/index'
export { registerHospitalityJobs } from './jobs/index'
export type { HospitalityJobScheduler } from './jobs/index'
export type { EventBus } from './hooks/index'
