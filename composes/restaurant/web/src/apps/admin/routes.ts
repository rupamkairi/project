import { createRoute } from '@tanstack/react-router'
import { sharedRootRoute } from '@projectx/shared-router'
import { requireAuth } from '@projectx/plugin-auth-web'
import { AdminDashboardPage } from './pages/dashboard'
import { AdminMenuPage } from './pages/menu'
import { AdminInventoryPage } from './pages/inventory'
import { AdminAggregatorsPage } from './pages/aggregators'
import { AdminAnalyticsPage } from './pages/analytics'

const adminDashboardRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/restaurants/admin/dashboard',
  beforeLoad: () => requireAuth(),
  component: AdminDashboardPage,
})

const adminMenuRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/restaurants/admin/menu',
  beforeLoad: () => requireAuth(),
  component: AdminMenuPage,
})

const adminInventoryRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/restaurants/admin/inventory',
  beforeLoad: () => requireAuth(),
  component: AdminInventoryPage,
})

const adminAggregatorsRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/restaurants/admin/aggregators',
  beforeLoad: () => requireAuth(),
  component: AdminAggregatorsPage,
})

const adminAnalyticsRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/restaurants/admin/analytics',
  beforeLoad: () => requireAuth(),
  component: AdminAnalyticsPage,
})

export const adminRoutes = [
  adminDashboardRoute,
  adminMenuRoute,
  adminInventoryRoute,
  adminAggregatorsRoute,
  adminAnalyticsRoute,
]
