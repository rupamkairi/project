import { createRoute } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { UserMenu, AuthGuard, requireAuth } from '@projectx/plugin-auth-web'
import { sharedRootRoute } from '@projectx/shared-router'
import { StackedAppLayout } from '@projectx/ui'
import type { NavBarItem } from '@projectx/ui'
import {
  LayoutDashboard,
  Users,
  Building2,
  UserPlus,
  TrendingUp,
  Activity,
  Megaphone,
  Filter,
  Ticket,
} from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/crm',
  beforeLoad: () => requireAuth(),
  component: CrmLayout,
})

const NAV_ITEMS: NavBarItem[] = [
  { label: 'Dashboard', href: '/crm', icon: LayoutDashboard, exact: true },
  { label: 'Contacts', href: '/crm/contacts', icon: Users },
  { label: 'Accounts', href: '/crm/accounts', icon: Building2 },
  { label: 'Leads', href: '/crm/leads', icon: UserPlus },
  { label: 'Deals', href: '/crm/deals', icon: TrendingUp },
  { label: 'Activities', href: '/crm/activities', icon: Activity },
  { label: 'Campaigns', href: '/crm/campaigns', icon: Megaphone },
  { label: 'Segments', href: '/crm/segments', icon: Filter },
  { label: 'Tickets', href: '/crm/tickets', icon: Ticket },
]

function CrmLayout() {
  return (
    <AuthGuard>
      <StackedAppLayout composeTitle="CRM" composeItems={NAV_ITEMS} userMenu={<UserMenu />}>
        <Outlet />
      </StackedAppLayout>
    </AuthGuard>
  )
}
