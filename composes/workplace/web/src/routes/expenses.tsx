import { createRoute } from '@tanstack/react-router'
import { Route as WorkplaceLayoutRoute } from './layout'
import { workplaceApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/expenses',
  component: ExpensesPage,
})

function ExpensesPage() {
  return (
    <CrudTablePage
      title="Expenses"
      description="Employee expense claims."
      createLabel="Add Expense"
      columns={[
        { header: 'Employee', accessor: (r) => r.employeeId ?? '—' },
        { header: 'Amount', accessor: (r) => String(r.amount ?? '—') },
        { header: 'Status', accessor: (r) => r.status ?? '—' },
      ]}
      fields={[
        { key: 'employeeId', label: 'Employee ID' },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
      list={async () => {
        const res = await workplaceApi.expenses.list()
        if (res.error) throw new Error(res.error)
        return normalizeList(res.data)
      }}
      create={(body) => mutateOk(workplaceApi.expenses.create(body))}
    />
  )
}
