import { createRoute, Outlet } from '@tanstack/react-router'
import { sharedRootRoute } from '@projectx/shared-router'
import { NavBar } from '@projectx/ui'
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
  component: WorkplaceLayout,
})

const NAV_ITEMS = [
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
    <div className="flex flex-col min-h-screen bg-background">
      <NavBar items={NAV_ITEMS} />
      <main className="flex-1 container mx-auto py-6 px-4">
        <Outlet />
      </main>
    </div>
  )
}
