import { createRoute } from '@tanstack/react-router'
import { Route as projectLayoutRoute } from './layout'
import { projectManagementApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/boards',
  component: BoardsPage,
})

function BoardsPage() {
  return (
    <CrudTablePage
      title="Boards"
      description="Scrum and Kanban boards"
      createLabel="Add Board"
      columns={[
        { header: 'Name', accessor: (r) => r.name },
        { header: 'Type', accessor: (r) => r.type ?? '—' },
        { header: 'Project', accessor: (r) => r.projectId ?? '—' },
      ]}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'projectId', label: 'Project ID', required: true },
        { key: 'type', label: 'Type' },
      ]}
      defaults={{ type: 'kanban' }}
      list={async () => {
        const res = await projectManagementApi.getBoards()
        if (res.error) throw new Error(res.error)
        return normalizeList(res.data)
      }}
      create={(body) => mutateOk(projectManagementApi.createBoard(body))}
      remove={(id) => mutateOk(projectManagementApi.deleteBoard(id))}
    />
  )
}
