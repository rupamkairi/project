import { createRoute, Link } from '@tanstack/react-router'
import { sharedRootRoute } from '@projectx/shared-router'
import { requireAuth } from '@projectx/plugin-auth-web'
import { PageHeader, Card, CardHeader, CardTitle, CardDescription } from '@projectx/ui'
import { AdminDashboardPage } from '../apps/admin/pages/dashboard'

const actions = [
  {
    label: 'Operations Dashboard',
    to: '/restaurants/admin/dashboard',
    description: 'Outlet overview and state',
  },
  { label: 'POS', to: '/restaurants/pos/orders', description: 'Order entry and table service' },
  { label: 'KDS', to: '/restaurants/kds', description: 'Kitchen display system' },
  { label: 'Tables', to: '/restaurants/pos/tables', description: 'Floor and table management' },
  { label: 'Menu', to: '/restaurants/admin/menu', description: 'Menu management' },
  { label: 'Inventory', to: '/restaurants/admin/inventory', description: 'Stock and inventory' },
  {
    label: 'Delivery Partners',
    to: '/restaurants/admin/aggregators',
    description: 'Delivery partner mappings',
  },
  { label: 'Reports', to: '/restaurants/admin/analytics', description: 'Analytics and reports' },
  {
    label: 'Customer Ordering',
    to: '/restaurants/customer/menu',
    description: 'Customer menu and ordering',
  },
] as const

function RestaurantHub() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Restaurant Management"
        description="Multi-outlet restaurant operations, POS, kitchen, and customer ordering"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="no-underline">
            <Card className="h-full hover:border-foreground/20 transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{a.label}</CardTitle>
                <CardDescription>{a.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <AdminDashboardPage />
    </div>
  )
}

export const restaurantsIndexRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/restaurants',
  beforeLoad: () => requireAuth(),
  component: RestaurantHub,
})
