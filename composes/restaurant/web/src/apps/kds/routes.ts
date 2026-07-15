import { createRoute } from '@tanstack/react-router'
import { sharedRootRoute } from '@projectx/shared-router'
import { requireAuth } from '@projectx/plugin-auth-web'
import { KdsBoardPage } from './pages/board'

const kdsBoardRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/restaurants/kds',
  beforeLoad: () => requireAuth(),
  component: KdsBoardPage,
})

export const kdsRoutes = [kdsBoardRoute]
