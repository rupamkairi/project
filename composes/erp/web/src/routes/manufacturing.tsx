import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as ErpLayoutRoute } from './layout'
import { erpApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: '/manufacturing',
  component: ManufacturingPage,
})

function ManufacturingPage() {
  const [tab, setTab] = useState('boms')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line">
        <TabsTrigger value="boms">BOMs</TabsTrigger>
        <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
      </TabsList>
      <TabsContent value="boms">
        <CrudTablePage
          title="Bills of Materials"
          description="Product assemblies."
          createLabel="Add BOM"
          columns={[
            { header: 'Name', accessor: (r) => r.name ?? r.id },
            { header: 'Item', accessor: (r) => r.itemId ?? '—' },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'itemId', label: 'Item ID' },
          ]}
          list={async () => {
            const res = await erpApi.boms.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.boms.create(body))}
        />
      </TabsContent>
      <TabsContent value="work-orders">
        <CrudTablePage
          title="Work Orders"
          description="Shop-floor production jobs."
          createLabel="Add Work Order"
          columns={[
            { header: 'ID', accessor: (r) => r.id },
            { header: 'Item', accessor: (r) => r.itemId ?? '—' },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'itemId', label: 'Item ID', required: true },
            { key: 'qty', label: 'Qty', type: 'number', required: true },
          ]}
          list={async () => {
            const res = await erpApi.workOrders.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.workOrders.create(body))}
        />
      </TabsContent>
    </Tabs>
  )
}
