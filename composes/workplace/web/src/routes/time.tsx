import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as WorkplaceLayoutRoute } from './layout'
import { workplaceApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/time',
  component: TimePage,
})

function TimePage() {
  const [tab, setTab] = useState('leave')
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line">
        <TabsTrigger value="leave">Leave</TabsTrigger>
        <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
        <TabsTrigger value="shifts">Shifts</TabsTrigger>
      </TabsList>
      <TabsContent value="leave">
        <CrudTablePage
          title="Leave Requests"
          description="Time-off requests."
          createLabel="Add Request"
          columns={[
            { header: 'Employee', accessor: (r) => r.employeeId ?? '—' },
            { header: 'Type', accessor: (r) => r.leaveTypeId ?? r.type ?? '—' },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'employeeId', label: 'Employee ID', required: true },
            { key: 'leaveTypeId', label: 'Leave type ID' },
            { key: 'startDate', label: 'Start', type: 'datetime' },
            { key: 'endDate', label: 'End', type: 'datetime' },
          ]}
          list={async () => {
            const res = await workplaceApi.leaveRequests.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.leaveRequests.create(body))}
        />
      </TabsContent>
      <TabsContent value="timesheets">
        <CrudTablePage
          title="Timesheets"
          description="Logged work time."
          createLabel="Add Timesheet"
          columns={[
            { header: 'Employee', accessor: (r) => r.employeeId ?? '—' },
            { header: 'Period', accessor: (r) => r.period ?? r.weekStart ?? '—' },
            { header: 'Status', accessor: (r) => r.status ?? '—' },
          ]}
          fields={[
            { key: 'employeeId', label: 'Employee ID', required: true },
            { key: 'weekStart', label: 'Week start' },
          ]}
          list={async () => {
            const res = await workplaceApi.timesheets.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.timesheets.create(body))}
        />
      </TabsContent>
      <TabsContent value="shifts">
        <CrudTablePage
          title="Shifts"
          description="Shift templates."
          createLabel="Add Shift"
          columns={[
            { header: 'Name', accessor: (r) => r.name },
            { header: 'Start', accessor: (r) => r.startTime ?? '—' },
            { header: 'End', accessor: (r) => r.endTime ?? '—' },
          ]}
          fields={[
            { key: 'name', label: 'Name', required: true },
            { key: 'startTime', label: 'Start time' },
            { key: 'endTime', label: 'End time' },
          ]}
          list={async () => {
            const res = await workplaceApi.shifts.list()
            if (res.error) throw new Error(res.error)
            return normalizeList(res.data)
          }}
          create={(body) => mutateOk(workplaceApi.shifts.create(body))}
        />
      </TabsContent>
    </Tabs>
  )
}
