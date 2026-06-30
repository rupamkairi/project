import { Route as crmLayoutRoute } from "./layout"
import { Route as dashboardRoute } from "./dashboard"
import { Route as contactsRoute } from "./contacts/index"
import { Route as contactDetailRoute } from "./contacts/detail"
import { Route as accountsRoute } from "./accounts/index"
import { Route as accountDetailRoute } from "./accounts/detail"
import { Route as leadsRoute } from "./leads/index"
import { Route as leadDetailRoute } from "./leads/detail"
import { Route as dealsRoute } from "./deals/index"
import { Route as dealDetailRoute } from "./deals/detail"
import { Route as activitiesRoute } from "./activities/index"
import { Route as campaignsRoute } from "./campaigns/index"
import { Route as campaignDetailRoute } from "./campaigns/detail"
import { Route as segmentsRoute } from "./segments/index"
import { Route as segmentDetailRoute } from "./segments/detail"
import { Route as ticketsRoute } from "./tickets/index"

export const crmRoutes = crmLayoutRoute.addChildren([
  dashboardRoute,
  contactsRoute,
  contactDetailRoute,
  accountsRoute,
  accountDetailRoute,
  leadsRoute,
  leadDetailRoute,
  dealsRoute,
  dealDetailRoute,
  activitiesRoute,
  campaignsRoute,
  campaignDetailRoute,
  segmentsRoute,
  segmentDetailRoute,
  ticketsRoute,
])
