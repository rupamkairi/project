import { createRoute } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { UserMenu, AuthGuard, requireAuth } from '@projectx/plugin-auth-web'
import { sharedRootRoute } from '@projectx/shared-router'
import { StackedAppLayout } from '@projectx/ui'
import type { NavBarItem } from '@projectx/ui'
import { LayoutDashboard, FolderKanban, CheckSquare, ClipboardList, BarChart3 } from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/projects',
  beforeLoad: () => requireAuth(),
  component: ProjectManagementLayout,
})

const NAV_ITEMS: NavBarItem[] = [
  { label: 'Dashboard', href: '/projects', icon: LayoutDashboard, exact: true },
  { label: 'Portfolios', href: '/projects/portfolios', icon: FolderKanban },
  { label: 'My Work', href: '/projects/my-work', icon: CheckSquare },
  { label: 'Boards', href: '/projects/boards', icon: ClipboardList },
  { label: 'Reports', href: '/projects/reports', icon: BarChart3 },
]

function ProjectManagementLayout() {
  return (
    <AuthGuard>
      <StackedAppLayout composeTitle="Projects" composeItems={NAV_ITEMS} userMenu={<UserMenu />}>
        <Outlet />
      </StackedAppLayout>
    </AuthGuard>
  )
}
