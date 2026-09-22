import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as ErpLayoutRoute } from './layout'
import { erpApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: '/inventory',
  component: InventoryPage,
})

function InventoryPage() {
  const [tab, setTab] = useState('items')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line">
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        <TabsTrigger value="stock">Stock</TabsTrigger>
      </TabsList>
      <TabsContent value="items">
        <CrudTablePage
          title="Items"
          description="Catalog items."
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'SKU', accessor: (r) => r.sku ?? r.meta?.sku ?? '—' },
            { header: 'Type', accessor: (r) => r.type ?? '—' },
          ]}
          fields={[{ key: 'name', label: 'Name', required: true }]}
          list={async () => {
            const res = await erpApi.items.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
        />
      </TabsContent>
      <TabsContent value="warehouses">
        <CrudTablePage
          title="Warehouses"
          description="Storage locations."
          createLabel="Add Warehouse"
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'Code', accessor: (r) => r.code ?? '—' },
            { header: 'Type', accessor: (r) => r.type ?? '—' },
          ]}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'code', label: 'Code' },
            { key: 'type', label: 'Type' },
          ]}
          defaults={{ type: 'warehouse' }}
          list={async () => {
            const res = await erpApi.warehouses.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.warehouses.create(body))}
        />
      </TabsContent>
      <TabsContent value="stock">
        <CrudTablePage
          title="Stock movements"
          description="Inventory quantity changes."
          createLabel="Add Movement"
          columns={[
            { header: 'Item', accessor: (r) => r.itemId ?? r.itemName ?? '—' },
            { header: 'Qty', accessor: (r) => String(r.qty ?? r.quantity ?? '—') },
            { header: 'Type', accessor: (r) => r.type ?? r.reason ?? '—' },
          ]}
          fields={[
            { key: 'itemId', label: 'Item ID', required: true },
            { key: 'warehouseId', label: 'Warehouse ID' },
            { key: 'qty', label: 'Qty', type: 'number', required: true },
            { key: 'reason', label: 'Reason' },
          ]}
          list={async () => {
            const res = await erpApi.stock.movements()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.stock.create(body))}
        />
      </TabsContent>
    </Tabs>
  )
}
