import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as WorkplaceLayoutRoute } from './layout'
import { workplaceApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/people',
  component: PeoplePage,
})

function PeoplePage() {
  const [tab, setTab] = useState('employees')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line">
        <TabsTrigger value="employees">Employees</TabsTrigger>
        <TabsTrigger value="departments">Departments</TabsTrigger>
        <TabsTrigger value="positions">Positions</TabsTrigger>
      </TabsList>
      <TabsContent value="employees">
        <CrudTablePage
          title="Employees"
          description="Workforce records."
          createLabel="Add Employee"
          columns={[
            { header: 'Code', accessor: (r) => r.employeeCode ?? '—' },
            { header: 'Name', accessor: (r) => [r.firstName, r.lastName].filter(Boolean).join(' ') || r.personId },
            { header: 'Status', accessor: (r) => r.employmentStatus ?? '—' },
          ]}
          fields={[
            { key: 'firstName', label: 'First name', required: true },
            { key: 'lastName', label: 'Last name' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'employeeCode', label: 'Employee code', required: true },
            { key: 'employmentType', label: 'Employment type' },
          ]}
          defaults={{ employmentType: 'permanent' }}
          list={async () => {
            const res = await workplaceApi.employees.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.employees.create(body))}
          update={(id, body) => mutateOk(workplaceApi.employees.update(id, body))}
        />
      </TabsContent>
      <TabsContent value="departments">
        <CrudTablePage
          title="Departments"
          description="Org units."
          createLabel="Add Department"
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'Code', accessor: (r) => r.code ?? '—' },
          ]}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'code', label: 'Code' },
          ]}
          list={async () => {
            const res = await workplaceApi.departments.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.departments.create(body))}
          update={(id, body) => mutateOk(workplaceApi.departments.update(id, body))}
        />
      </TabsContent>
      <TabsContent value="positions">
        <CrudTablePage
          title="Positions"
          description="Job positions."
          createLabel="Add Position"
          columns={[
            { header: 'Name', accessor: (r) => r.name ?? r.title },
            { header: 'Department', accessor: (r) => r.departmentId ?? '—' },
          ]}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'title', label: 'Title' },
            { key: 'departmentId', label: 'Department ID' },
          ]}
          list={async () => {
            const res = await workplaceApi.positions.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.positions.create(body))}
          update={(id, body) => mutateOk(workplaceApi.positions.update(id, body))}
        />
      </TabsContent>
    </Tabs>
  )
}
