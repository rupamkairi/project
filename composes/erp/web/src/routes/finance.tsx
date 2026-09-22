import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as ErpLayoutRoute } from './layout'
import { erpApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: '/finance',
  component: FinancePage,
})

function FinancePage() {
  const [tab, setTab] = useState('accounts')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line">
        <TabsTrigger value="accounts">Accounts</TabsTrigger>
        <TabsTrigger value="journals">Journal Entries</TabsTrigger>
      </TabsList>
      <TabsContent value="accounts">
        <CrudTablePage
          title="Accounts"
          description="Chart of accounts."
          createLabel="Add Account"
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'Code', accessor: (r) => r.code ?? '—' },
            { header: 'Type', accessor: (r) => r.type ?? '—' },
          ]}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'code', label: 'Code' },
            { key: 'type', label: 'Type', required: true },
          ]}
          list={async () => {
            const res = await erpApi.accounts.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.accounts.create(body))}
        />
      </TabsContent>
      <TabsContent value="journals">
        <CrudTablePage
          title="Journal Entries"
          description="Manual journals."
          createLabel="Add Journal"
          columns={[
            { header: 'ID', accessor: (r) => r.id },
            { header: 'Memo', accessor: (r) => r.memo ?? r.description ?? '—' },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'memo', label: 'Memo', required: true },
            { key: 'description', label: 'Description', type: 'textarea' },
          ]}
          list={async () => {
            const res = await erpApi.accounts.journalEntries()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(erpApi.accounts.createJe(body))}
        />
      </TabsContent>
    </Tabs>
  )
}
