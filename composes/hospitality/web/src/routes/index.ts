import { hospitalityLayoutRoute } from './layout'
import { Route as dashboardRoute } from './dashboard'
import { Route as reservationsRoute } from './reservations'
import { Route as roomsRoute } from './rooms'
import { Route as guestsRoute } from './guests'
import { Route as foliosRoute } from './folios'
import { Route as housekeepingRoute } from './housekeeping'
import { Route as servicesRoute } from './services'
import { Route as partnersRoute } from './partners'
import { Route as venuesRoute } from './venues'
import { Route as reportsRoute } from './reports'
import { Route as settingsRoute } from './settings'
import { guestStayRoute } from './guest'

export const hospitalityRoutes = [
  hospitalityLayoutRoute.addChildren([
    dashboardRoute,
    reservationsRoute,
    roomsRoute,
    guestsRoute,
    foliosRoute,
    housekeepingRoute,
    servicesRoute,
    partnersRoute,
    venuesRoute,
    reportsRoute,
    settingsRoute,
  ]),
  guestStayRoute,
]
