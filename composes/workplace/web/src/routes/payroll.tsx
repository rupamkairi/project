import { createRoute } from '@tanstack/react-router'
import { Route as WorkplaceLayoutRoute } from './layout'
import { workplaceApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/payroll',
  component: PayrollPage,
})

function PayrollPage() {
  return (
    <CrudTablePage
      title="Payroll Runs"
      description="Pay cycles."
      createLabel="Add Run"
      columns={[
        { header: 'Period', accessor: (r) => r.period ?? r.name ?? r.id },
        { header: 'Status', accessor: (r) => r.status ?? '—' },
        { header: 'Created', accessor: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
      ]}
      fields={[
        { key: 'period', label: 'Period', required: true },
        { key: 'name', label: 'Name' },
      ]}
      list={async () => {
        const res = await workplaceApi.payrollRuns.list()
        if (res.error) throw new Error(res.error)
        return normalizeList(res.data)
      }}
      create={(body) => mutateOk(workplaceApi.payrollRuns.create(body))}
    />
  )
}
