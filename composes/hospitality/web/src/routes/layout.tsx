import { createRoute } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { UserMenu, AuthGuard, requireAuth } from '@projectx/plugin-auth-web'
import { sharedRootRoute } from '@projectx/shared-router'
import { StackedAppLayout } from '@projectx/ui'
import type { NavBarItem } from '@projectx/ui'
import {
  LayoutDashboard,
  Calendar,
  DoorOpen,
  Users,
  Receipt,
  SprayCan,
  BellRing,
  Handshake,
  Building2,
  BarChart3,
} from 'lucide-react'

export const hospitalityLayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/hospitality',
  beforeLoad: () => requireAuth(),
  component: HospitalityLayout,
})

export const Route = hospitalityLayoutRoute

const NAV_ITEMS: NavBarItem[] = [
  { label: 'Dashboard', href: '/hospitality', icon: LayoutDashboard, exact: true },
  { label: 'Reservations', href: '/hospitality/reservations', icon: Calendar },
  { label: 'Rooms', href: '/hospitality/rooms', icon: DoorOpen },
  { label: 'Guests', href: '/hospitality/guests', icon: Users },
  { label: 'Folios', href: '/hospitality/folios', icon: Receipt },
  { label: 'Housekeeping', href: '/hospitality/housekeeping', icon: SprayCan },
  { label: 'Services', href: '/hospitality/services', icon: BellRing },
  { label: 'Partners', href: '/hospitality/partners', icon: Handshake },
  { label: 'Venues', href: '/hospitality/venues', icon: Building2 },
  { label: 'Reports', href: '/hospitality/reports', icon: BarChart3 },
]

function HospitalityLayout() {
  return (
    <AuthGuard>
      <StackedAppLayout composeTitle="Hospitality" composeItems={NAV_ITEMS} userMenu={<UserMenu />}>
        <Outlet />
      </StackedAppLayout>
    </AuthGuard>
  )
}
