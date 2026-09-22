import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'
import { hospitalityApi } from '../lib/api'
import { CrudTablePage, normalizeList } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/housekeeping',
  component: HousekeepingPage,
})

function HousekeepingPage() {
  return (
    <CrudTablePage
      title="Housekeeping"
      description="Room cleaning tasks."
      columns={[
        { header: 'Room', accessor: (r) => r.roomId ?? r.roomNumber ?? '—' },
        { header: 'Status', accessor: (r) => r.status ?? '—' },
        { header: 'Assignee', accessor: (r) => r.assigneeId ?? '—' },
      ]}
      fields={[]}
      list={async () => normalizeList(await hospitalityApi.getHousekeeping())}
    />
  )
}
