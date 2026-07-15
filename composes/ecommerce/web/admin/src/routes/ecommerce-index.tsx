import { createRoute, Link } from '@tanstack/react-router'
import { sharedRootRoute } from '@projectx/shared-router'
import { PageHeader, Card, CardHeader, CardTitle, CardDescription } from '@projectx/ui'
import { useQuery } from '@tanstack/react-query'
import { ecommerceAdminApi } from '../lib/api'
import { formatCurrency } from '../lib/format'
import { requireAuth } from '@projectx/plugin-auth-web'

interface RecentOrder {
  id: string
  referenceNo?: string | null
  totalAmount?: number | string | null
  status?: string | null
  person?: { email?: string | null } | null
}

interface EcommerceAnalytics {
  gmv?: number
  orderCount?: number
  aov?: number
  returnRate?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readAnalytics(value: unknown): EcommerceAnalytics {
  if (!isRecord(value)) return {}

  const analytics: EcommerceAnalytics = {}
  if (typeof value.gmv === 'number') analytics.gmv = value.gmv
  if (typeof value.orderCount === 'number') analytics.orderCount = value.orderCount
  if (typeof value.aov === 'number') analytics.aov = value.aov
  if (typeof value.returnRate === 'string') analytics.returnRate = value.returnRate
  return analytics
}

function readRecentOrders(value: unknown): RecentOrder[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item): RecentOrder[] => {
    if (!isRecord(item) || typeof item.id !== 'string') return []
    const person = isRecord(item.person) ? item.person : null
    return [
      {
        id: item.id,
        referenceNo: typeof item.referenceNo === 'string' ? item.referenceNo : null,
        totalAmount:
          typeof item.totalAmount === 'number' || typeof item.totalAmount === 'string'
            ? item.totalAmount
            : null,
        status: typeof item.status === 'string' ? item.status : null,
        person: person && typeof person.email === 'string' ? { email: person.email } : null,
      },
    ]
  })
}

const actions = [
  {
    label: 'Admin Operations',
    to: '/ecommerce/admin',
    description: 'Products, orders, fulfillment, and customers',
  },
  { label: 'Storefront', to: '/ecommerce/store', description: 'Customer-facing store' },
] as const

function EcommerceHub() {
  const { data: analyticsData } = useQuery({
    queryKey: ['ecommerce-hub-analytics'],
    queryFn: () => ecommerceAdminApi.getAnalytics(),
  })
  const { data: ordersData } = useQuery({
    queryKey: ['ecommerce-hub-orders'],
    queryFn: () => ecommerceAdminApi.getOrders({ limit: 5 }),
  })

  const analytics = readAnalytics(analyticsData?.data)
  const orders = readRecentOrders(ordersData?.data?.data)

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Ecommerce" description="Store operations and customer storefront" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'GMV', value: analytics.gmv ?? 0 },
          { label: 'Orders', value: analytics.orderCount ?? 0 },
          { label: 'AOV', value: analytics.aov ?? 0 },
          { label: 'Return Rate', value: analytics.returnRate ?? '0%' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1">
              {typeof kpi.value === 'number' ? formatCurrency(kpi.value) : kpi.value}
            </p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <div>
        <h3 className="text-sm font-medium mb-3">Recent Orders</h3>
        <div className="rounded-lg border">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No orders yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Order</th>
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Total</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="p-3">{o.referenceNo}</td>
                    <td className="p-3">{o.person?.email ?? '—'}</td>
                    <td className="p-3">{formatCurrency(Number(o.totalAmount ?? 0))}</td>
                    <td className="p-3">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export const ecommerceIndexRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/ecommerce',
  beforeLoad: () => requireAuth(),
  component: EcommerceHub,
})
