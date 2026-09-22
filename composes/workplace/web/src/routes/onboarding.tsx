import { createRoute } from '@tanstack/react-router'
import { Route as WorkplaceLayoutRoute } from './layout'
import { workplaceApi } from '../lib/api'
import { CrudTablePage, normalizeList } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/onboarding',
  component: OnboardingPage,
})

function OnboardingPage() {
  return (
    <CrudTablePage
      title="Onboarding"
      description="New-hire workflows."
      columns={[
        { header: 'Employee', accessor: (r) => r.employeeId ?? r.name ?? r.id },
        { header: 'Status', accessor: (r) => r.status ?? '—' },
        { header: 'Progress', accessor: (r) => String(r.progress ?? r.completedTasks ?? '—') },
      ]}
      fields={[]}
      list={async () => {
        const res = await workplaceApi.onboarding.list()
        if (res.error) throw new Error(res.error)
        return normalizeList(res.data)
      }}
    />
  )
}
