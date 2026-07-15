import { Route as projectLayoutRoute } from './layout'
import { Route as dashboardRoute } from './dashboard'
import { Route as portfoliosRoute } from './portfolios'
import { Route as myWorkRoute } from './my-work'
import { Route as boardsRoute } from './boards'
import { Route as reportsRoute } from './reports'

export const projectManagementRoutes = [
  projectLayoutRoute.addChildren([
    dashboardRoute,
    portfoliosRoute,
    myWorkRoute,
    boardsRoute,
    reportsRoute,
  ]),
]
