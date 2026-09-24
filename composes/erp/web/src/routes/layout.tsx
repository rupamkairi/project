import { createRoute, Outlet } from '@tanstack/react-router'
import { UserMenu, AuthGuard, requireAuth } from '@projectx/plugin-auth-web'
import { sharedRootRoute } from '@projectx/shared-router'
import { StackedAppLayout } from '@projectx/ui'
import type { NavBarItem } from '@projectx/ui'
import {
  ShoppingCart,
  TrendingUp,
  Package,
  DollarSign,
  Factory,
  FileText,
  LayoutDashboard,
} from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/erp',
  beforeLoad: () => requireAuth(),
  component: ErpLayout,
})

const NAV_ITEMS: NavBarItem[] = [
  { label: 'Dashboard', href: '/erp', icon: LayoutDashboard, exact: true },
  { label: 'Procurement', href: '/erp/procurement', icon: ShoppingCart },
  { label: 'Sales', href: '/erp/sales', icon: TrendingUp },
  { label: 'Inventory', href: '/erp/inventory', icon: Package },
  { label: 'Finance', href: '/erp/finance', icon: DollarSign },
  { label: 'Manufacturing', href: '/erp/manufacturing', icon: Factory },
  { label: 'Tax / GST', href: '/erp/tax', icon: FileText },
]

function ErpLayout() {
  return (
    <AuthGuard>
      <StackedAppLayout
        composeTitle="ERP"
        composeItems={NAV_ITEMS}
        userMenu={<UserMenu />}
        mainClassName="container mx-auto py-6 px-4"
      >
        <Outlet />
      </StackedAppLayout>
    </AuthGuard>
  )
}
