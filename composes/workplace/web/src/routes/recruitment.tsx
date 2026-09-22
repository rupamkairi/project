import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as WorkplaceLayoutRoute } from './layout'
import { workplaceApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/recruitment',
  component: RecruitmentPage,
})

function RecruitmentPage() {
  const [tab, setTab] = useState('jobs')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line">
        <TabsTrigger value="jobs">Job openings</TabsTrigger>
        <TabsTrigger value="applications">Applications</TabsTrigger>
      </TabsList>
      <TabsContent value="jobs">
        <CrudTablePage
          title="Job Openings"
          description="Open roles."
          createLabel="Add Opening"
          columns={[
            { header: 'Title', accessor: (r) => r.title ?? r.name },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
            { header: 'Department', accessor: (r) => r.departmentId ?? '—' },
          ]}
          fields={[
            { key: 'title', label: 'Title', required: true },
            { key: 'departmentId', label: 'Department ID' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ]}
          list={async () => {
            const res = await workplaceApi.jobOpenings.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.jobOpenings.create(body))}
          update={(id, body) => mutateOk(workplaceApi.jobOpenings.update(id, body))}
        />
      </TabsContent>
      <TabsContent value="applications">
        <CrudTablePage
          title="Applications"
          description="Candidates."
          createLabel="Add Application"
          columns={[
            { header: 'Candidate', accessor: (r) => r.candidateName ?? r.email ?? r.id },
            { header: 'Job', accessor: (r) => r.jobOpeningId ?? '—' },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'jobOpeningId', label: 'Job opening ID', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
            { key: 'candidateName', label: 'Name' },
          ]}
          list={async () => {
            const res = await workplaceApi.applications.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.applications.create(body))}
          update={(id, body) => mutateOk(workplaceApi.applications.update(id, body))}
        />
      </TabsContent>
    </Tabs>
  )
}
