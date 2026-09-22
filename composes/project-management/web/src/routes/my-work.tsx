import { createRoute } from '@tanstack/react-router'
import { Route as projectLayoutRoute } from './layout'
import { projectManagementApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/my-work',
  component: MyWorkPage,
})

function MyWorkPage() {
  return (
    <CrudTablePage
      title="My Work"
      description="Work items assigned to you across all projects"
      createLabel="Add Work Item"
      columns={[
        { header: 'Ref', accessor: (r) => r.ref ?? r.id },
        { header: 'Title', accessor: (r) => r.title },
        { header: 'Type', accessor: (r) => r.type ?? '—' },
        { header: 'Priority', accessor: (r) => r.priority ?? '—' },
        { header: 'Status', accessor: (r) => r.status ?? '—' },
      ]}
      fields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'projectId', label: 'Project ID' },
        { key: 'type', label: 'Type' },
        { key: 'priority', label: 'Priority' },
      ]}
      defaults={{ type: 'task', priority: 'medium' }}
      list={async () => {
        const mine = await projectManagementApi.getMyWork()
        if (mine.error) {
          const all = await projectManagementApi.getWorkItems()
          if (all.error) throw new Error(all.error)
          return normalizeList(all.data)
        }
        const normalized = normalizeList(mine.data)
        if (normalized.items.length === 0) {
          const all = await projectManagementApi.getWorkItems()
          if (!all.error) return normalizeList(all.data)
        }
        return normalized
      }}
      create={(body) => mutateOk(projectManagementApi.createWorkItem(body))}
      update={(id, body) => mutateOk(projectManagementApi.updateWorkItem(id, body))}
    />
  )
}
