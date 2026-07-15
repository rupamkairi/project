import { createRoute } from '@tanstack/react-router'
import { sharedRootRoute } from '@projectx/shared-router'
import { requireAuth } from '@projectx/plugin-auth-web'
import { PosOrdersPage } from './pages/orders'
import { NewOrderPage } from './pages/new-order'
import { OrderDetailPage } from './pages/order-detail'
import { PosTablesPage } from './pages/tables'

const posOrdersRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/restaurants/pos/orders',
  beforeLoad: () => requireAuth(),
  component: PosOrdersPage,
})

const posNewOrderRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/restaurants/pos/orders/new',
  beforeLoad: () => requireAuth(),
  component: NewOrderPage,
})

const posOrderDetailRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/restaurants/pos/orders/$id',
  beforeLoad: () => requireAuth(),
  component: OrderDetailPage,
})

const posTablesRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/restaurants/pos/tables',
  beforeLoad: () => requireAuth(),
  component: PosTablesPage,
})

export const posRoutes = [posOrdersRoute, posNewOrderRoute, posOrderDetailRoute, posTablesRoute]
