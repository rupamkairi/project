import { createRoute } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { UserMenu, AuthGuard, requireAuth } from '@projectx/plugin-auth-web'
import { sharedRootRoute } from '@projectx/shared-router'
import { StackedAppLayout } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/dashboard',
  beforeLoad: () => requireAuth(),
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <AuthGuard>
      <StackedAppLayout userMenu={<UserMenu />}>
        <Outlet />
      </StackedAppLayout>
    </AuthGuard>
  )
}
