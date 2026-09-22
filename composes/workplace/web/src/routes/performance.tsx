import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as WorkplaceLayoutRoute } from './layout'
import { workplaceApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/performance',
  component: PerformancePage,
})

function PerformancePage() {
  const [tab, setTab] = useState('goals')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line">
        <TabsTrigger value="goals">Goals</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
      </TabsList>
      <TabsContent value="goals">
        <CrudTablePage
          title="Goals"
          description="Employee goals."
          createLabel="Add Goal"
          columns={[
            { header: 'Title', accessor: (r) => r.title ?? r.name },
            { header: 'Employee', accessor: (r) => r.employeeId ?? '—' },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'title', label: 'Title', required: true },
            { key: 'employeeId', label: 'Employee ID' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ]}
          list={async () => {
            const res = await workplaceApi.goals.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.goals.create(body))}
          update={(id, body) => mutateOk(workplaceApi.goals.update(id, body))}
        />
      </TabsContent>
      <TabsContent value="reviews">
        <CrudTablePage
          title="Reviews"
          description="Performance reviews."
          createLabel="Add Review"
          columns={[
            { header: 'Employee', accessor: (r) => r.employeeId ?? '—' },
            { header: 'Cycle', accessor: (r) => r.cycleId ?? '—' },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'employeeId', label: 'Employee ID', required: true },
            { key: 'cycleId', label: 'Cycle ID' },
            { key: 'summary', label: 'Summary', type: 'textarea' },
          ]}
          list={async () => {
            const res = await workplaceApi.reviews.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.reviews.create(body))}
          update={(id, body) => mutateOk(workplaceApi.reviews.update(id, body))}
        />
      </TabsContent>
    </Tabs>
  )
}
