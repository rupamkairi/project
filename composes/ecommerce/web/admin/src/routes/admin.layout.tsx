import { createRoute } from '@tanstack/react-router'
import { sharedRootRoute } from '@projectx/shared-router'
import { StackedAppLayout } from '@projectx/ui'
import type { NavBarItem } from '@projectx/ui'
import { UserMenu, AuthGuard, requireAuth } from '@projectx/plugin-auth-web'
import { Outlet } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  Truck,
  RotateCcw,
  Users,
  BarChart3,
  Tag,
  Settings,
} from 'lucide-react'

const NAV_ITEMS: NavBarItem[] = [
  { label: 'Dashboard', href: '/ecommerce/admin', icon: LayoutDashboard, exact: true },
  { label: 'Products', href: '/ecommerce/admin/products', icon: Package },
  { label: 'Categories', href: '/ecommerce/admin/categories', icon: FolderOpen },
  { label: 'Orders', href: '/ecommerce/admin/orders', icon: ShoppingCart },
  { label: 'Fulfillment', href: '/ecommerce/admin/fulfillment', icon: Truck },
  { label: 'Returns', href: '/ecommerce/admin/returns', icon: RotateCcw },
  { label: 'Customers', href: '/ecommerce/admin/customers', icon: Users },
  { label: 'Analytics', href: '/ecommerce/admin/analytics', icon: BarChart3 },
  { label: 'Pricing', href: '/ecommerce/admin/pricing', icon: Tag },
  { label: 'Settings', href: '/ecommerce/admin/settings', icon: Settings },
]

function EcommerceAdminLayout() {
  return (
    <AuthGuard>
      <StackedAppLayout
        composeTitle="Ecommerce"
        composeItems={NAV_ITEMS}
        userMenu={<UserMenu />}
        mainClassName="p-6"
      >
        <Outlet />
      </StackedAppLayout>
    </AuthGuard>
  )
}

export const ecommerceAdminLayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/ecommerce/admin',
  beforeLoad: () => requireAuth(),
  component: EcommerceAdminLayout,
})
