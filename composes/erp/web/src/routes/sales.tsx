import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as ErpLayoutRoute } from './layout'
import { erpApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: '/sales',
  component: SalesPage,
})

function SalesPage() {
  const [tab, setTab] = useState('customers')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line">
        <TabsTrigger value="customers">Customers</TabsTrigger>
        <TabsTrigger value="orders">Sales Orders</TabsTrigger>
        <TabsTrigger value="delivery">Delivery Notes</TabsTrigger>
      </TabsList>
      <TabsContent value="customers">
        <CrudTablePage
          title="Customers"
          description="Sales customers."
          createLabel="Add Customer"
          columns={[
            { header: 'Name', accessor: (r) => r.name ?? name(r) },
            { header: 'Email', accessor: (r) => r.email ?? '—' },
            { header: 'Type', accessor: (r) => r.type ?? '—' },
          ]}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Phone' },
          ]}
          list={async () => {
            const res = await erpApi.customers.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.customers.create(body))}
          update={(id, body) => mutateOk(erpApi.customers.update(id, body))}
        />
      </TabsContent>
      <TabsContent value="orders">
        <CrudTablePage
          title="Sales Orders"
          description="Customer sales orders."
          createLabel="Add Sales Order"
          columns={[
            { header: 'Reference', accessor: (r) => r.referenceNo ?? r.id },
            { header: 'Type', accessor: (r) => r.type },
            { header: 'Total', accessor: (r) => String(r.totalAmount ?? '—') },
          ]}
          fields={[
            { key: 'customerId', label: 'Customer ID' },
            { key: 'partyId', label: 'Party ID' },
            { key: 'currency', label: 'Currency' },
          ]}
          defaults={{ currency: 'INR' }}
          list={async () => {
            const res = await erpApi.salesOrders.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.salesOrders.create(body))}
        />
      </TabsContent>
      <TabsContent value="delivery">
        <CrudTablePage
          title="Delivery Notes"
          description="Outbound shipments."
          createLabel="Add Delivery Note"
          columns={[
            { header: 'ID', accessor: (r) => r.id },
            { header: 'Order', accessor: (r) => r.salesOrderId ?? r.soId ?? '—' },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'salesOrderId', label: 'Sales order ID', required: true },
            { key: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          list={async () => {
            const res = await erpApi.deliveryNotes.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.deliveryNotes.create(body))}
        />
      </TabsContent>
    </Tabs>
  )
}

function name(r: any) {
  return [r.firstName, r.lastName].filter(Boolean).join(' ') || '—'
}
