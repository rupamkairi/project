import { createRoute } from '@tanstack/react-router'
import { ecommerceAdminLayoutRoute } from '../admin.layout'
import { PageHeader, Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@projectx/ui'
import { useQuery } from '@tanstack/react-query'
import { ecommerceAdminApi } from '../../lib/api'
import { formatCurrency } from '../../lib/format'

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  fulfilled: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  refunded: 'bg-zinc-100 text-zinc-600',
}

function AdminOrderDetail() {
  const id = window.location.pathname.split('/').at(-1) ?? ''

  const { data: orderData } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => ecommerceAdminApi.getOrder(id),
  })
  const order = orderData?.data

  const items = order?.lines ?? []
  const subtotal = items.reduce(
    (s: number, i: any) => s + (i.lineTotal?.amount ?? i.unitPrice * i.qty),
    0,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={order?.referenceNo ?? `Order ${id.slice(0, 8)}`}
        breadcrumbs={[
          { label: 'Orders', href: '/ecommerce/admin/orders' },
          { label: order?.referenceNo ?? '' },
        ]}
      />

      {order && (
        <div className="flex gap-4 text-sm">
          <span>
            Status: <Badge className={STATUS_BADGES[order.status]}>{order.status}</Badge>
          </span>
          <span className="text-muted-foreground">Customer: {order.person?.email ?? '—'}</span>
          <span className="text-muted-foreground">Total: {formatCurrency(order.totalAmount)}</span>
        </div>
      )}

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="fulfillment">Fulfillment</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="pt-4">
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Product</th>
                  <th className="p-3 font-medium">Qty</th>
                  <th className="p-3 font-medium">Unit Price</th>
                  <th className="p-3 font-medium">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i: any) => (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="p-3">{i.description ?? i.itemId}</td>
                    <td className="p-3">{i.qty}</td>
                    <td className="p-3">{formatCurrency(i.unitPrice?.amount ?? i.unitPrice)}</td>
                    <td className="p-3">
                      {formatCurrency(i.lineTotal?.amount ?? i.unitPrice * i.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-right mt-4 space-y-1 text-sm">
            <p>
              Subtotal: <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </p>
            {order?.shippingAmount ? (
              <p>
                Shipping:{' '}
                <span className="font-semibold">{formatCurrency(order.shippingAmount)}</span>
              </p>
            ) : null}
            <p className="text-base">
              Total: <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
            </p>
          </div>
        </TabsContent>

        <TabsContent value="addresses" className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            {order?.shippingAddress && (
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-medium mb-2">Shipping</h4>
                <p className="text-sm text-muted-foreground">
                  {JSON.stringify(order.shippingAddress)}
                </p>
              </div>
            )}
            {order?.billingAddress && (
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-medium mb-2">Billing</h4>
                <p className="text-sm text-muted-foreground">
                  {JSON.stringify(order.billingAddress)}
                </p>
              </div>
            )}
            {!order?.shippingAddress && !order?.billingAddress && (
              <p className="text-sm text-muted-foreground">No addresses on file</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="fulfillment" className="pt-4">
          <div className="space-y-4">
            {order?.fulfillments?.length > 0 ? (
              order.fulfillments.map((f: any) => (
                <div key={f.id} className="rounded-lg border p-4 text-sm space-y-1">
                  <p>
                    Status: <Badge>{f.status}</Badge>
                  </p>
                  {f.carrier && <p>Carrier: {f.carrier}</p>}
                  {f.trackingNumber && <p>Tracking: {f.trackingNumber}</p>}
                  {f.trackingUrl && (
                    <p>
                      <a href={f.trackingUrl} className="text-primary underline">
                        Track →
                      </a>
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Fulfillments live in the Fulfillment queue — order detail is read-only until
                order write endpoints land.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export const ecoAdminOrderDetailRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: '/orders/$id',
  component: AdminOrderDetail,
})
