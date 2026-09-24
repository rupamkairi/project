import { createRoute, Outlet } from '@tanstack/react-router'
import { UserMenu, AuthGuard, requireAuth } from '@projectx/plugin-auth-web'
import { sharedRootRoute } from '@projectx/shared-router'
import { StackedAppLayout } from '@projectx/ui'
import type { NavBarItem } from '@projectx/ui'
import {
  LayoutDashboard,
  Briefcase,
  UserPlus,
  Users,
  Clock,
  TrendingUp,
  CreditCard,
  Receipt,
  Building2,
  BarChart,
  User,
  Settings,
} from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/workplace',
  beforeLoad: () => requireAuth(),
  component: WorkplaceLayout,
})

const NAV_ITEMS: NavBarItem[] = [
  { label: 'Dashboard', href: '/workplace', icon: LayoutDashboard, exact: true },
  { label: 'Recruitment', href: '/workplace/recruitment', icon: Briefcase },
  { label: 'Onboarding', href: '/workplace/onboarding', icon: UserPlus },
  { label: 'People', href: '/workplace/people', icon: Users },
  { label: 'Time & Leave', href: '/workplace/time', icon: Clock },
  { label: 'Performance', href: '/workplace/performance', icon: TrendingUp },
  { label: 'Payroll', href: '/workplace/payroll', icon: CreditCard },
  { label: 'Expenses', href: '/workplace/expenses', icon: Receipt },
  { label: 'Office', href: '/workplace/office', icon: Building2 },
  { label: 'Reports', href: '/workplace/reports', icon: BarChart },
  { label: 'My Workplace', href: '/workplace/my', icon: User },
  { label: 'Settings', href: '/workplace/settings', icon: Settings },
]

function WorkplaceLayout() {
  return (
    <AuthGuard>
      <StackedAppLayout
        composeTitle="Workplace"
        composeItems={NAV_ITEMS}
        userMenu={<UserMenu />}
        mainClassName="container mx-auto py-6 px-4"
      >
        <Outlet />
      </StackedAppLayout>
    </AuthGuard>
  )
}
