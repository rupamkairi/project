import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as ErpLayoutRoute } from './layout'
import { erpApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: '/procurement',
  component: ProcurementPage,
})

function ProcurementPage() {
  const [tab, setTab] = useState('vendors')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line">
        <TabsTrigger value="vendors">Vendors</TabsTrigger>
        <TabsTrigger value="pos">Purchase Orders</TabsTrigger>
        <TabsTrigger value="grn">Goods Receipts</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
      </TabsList>
      <TabsContent value="vendors">
        <CrudTablePage
          title="Vendors"
          description="Supplier organizations."
          createLabel="Add Vendor"
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'Type', accessor: (r) => r.type },
            { header: 'Domain', accessor: (r) => r.domain ?? '—' },
          ]}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'gstin', label: 'GSTIN' },
            { key: 'type', label: 'Sub-type' },
          ]}
          list={async () => {
            const res = await erpApi.vendors.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.vendors.create(body))}
          update={(id, body) => mutateOk(erpApi.vendors.update(id, body))}
        />
      </TabsContent>
      <TabsContent value="pos">
        <CrudTablePage
          title="Purchase Orders"
          description="Procurement documents."
          createLabel="Add PO"
          columns={[
            { header: 'Reference', accessor: (r) => r.referenceNo ?? r.id },
            { header: 'Type', accessor: (r) => r.type },
            { header: 'Total', accessor: (r) => String(r.totalAmount ?? r.total ?? '—') },
          ]}
          fields={[
            { key: 'vendorId', label: 'Vendor ID', required: true },
            { key: 'currency', label: 'Currency' },
          ]}
          defaults={{ currency: 'INR' }}
          list={async () => {
            const res = await erpApi.purchaseOrders.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.purchaseOrders.create({ ...body, items: [] }))}
        />
      </TabsContent>
      <TabsContent value="grn">
        <CrudTablePage
          title="Goods Receipts"
          description="Inbound receipts against purchase orders."
          createLabel="Add GRN"
          columns={[
            { header: 'ID', accessor: (r) => r.id },
            { header: 'PO', accessor: (r) => r.poId ?? r.purchaseOrderId ?? '—' },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'poId', label: 'PO ID', required: true },
            { key: 'notes', label: 'Notes', type: 'textarea' },
          ]}
          list={async () => {
            const res = await erpApi.goodsReceipts.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.goodsReceipts.create(body))}
        />
      </TabsContent>
      <TabsContent value="payments">
        <CrudTablePage
          title="Payments"
          description="Vendor payments and receipts."
          createLabel="Add Payment"
          columns={[
            { header: 'Reference', accessor: (r) => r.referenceNo ?? r.id },
            { header: 'Type', accessor: (r) => r.type },
            { header: 'Amount', accessor: (r) => String(r.totalAmount ?? r.amount ?? '—') },
          ]}
          fields={[
            { key: 'partyId', label: 'Party ID' },
            { key: 'amount', label: 'Amount', type: 'number', required: true },
            { key: 'currency', label: 'Currency' },
          ]}
          defaults={{ currency: 'INR' }}
          list={async () => {
            const res = await erpApi.payments.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.payments.create(body))}
        />
      </TabsContent>
    </Tabs>
  )
}
