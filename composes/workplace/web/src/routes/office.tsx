import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as WorkplaceLayoutRoute } from './layout'
import { workplaceApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/office',
  component: OfficePage,
})

function OfficePage() {
  const [tab, setTab] = useState('assets')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line">
        <TabsTrigger value="assets">Assets</TabsTrigger>
        <TabsTrigger value="policies">Policies</TabsTrigger>
        <TabsTrigger value="visitors">Visitors</TabsTrigger>
      </TabsList>
      <TabsContent value="assets">
        <CrudTablePage
          title="Assets"
          description="Office equipment."
          createLabel="Add Asset"
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'Tag', accessor: (r) => r.tag ?? r.serial ?? '—' },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'tag', label: 'Tag' },
          ]}
          list={async () => {
            const res = await workplaceApi.assets.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.assets.create(body))}
        />
      </TabsContent>
      <TabsContent value="policies">
        <CrudTablePage
          title="Policies"
          description="Company policies."
          createLabel="Add Policy"
          columns={[
            { header: 'Name', accessor: (r) => r.name ?? r.title },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'title', label: 'Title' },
            { key: 'body', label: 'Body', type: 'textarea' },
          ]}
          list={async () => {
            const res = await workplaceApi.policies.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.policies.create(body))}
        />
      </TabsContent>
      <TabsContent value="visitors">
        <CrudTablePage
          title="Visitors"
          description="Visitor log."
          createLabel="Add Visitor"
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'Host', accessor: (r) => r.hostId ?? '—' },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'hostId', label: 'Host employee ID' },
            { key: 'purpose', label: 'Purpose' },
          ]}
          list={async () => {
            const res = await workplaceApi.visitors.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.visitors.create(body))}
        />
      </TabsContent>
    </Tabs>
  )
}
