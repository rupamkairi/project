import { createRoute } from '@tanstack/react-router'
import { Route as projectLayoutRoute } from './layout'
import { projectManagementApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/portfolios',
  component: PortfoliosPage,
})

function PortfoliosPage() {
  return (
    <CrudTablePage
      title="Portfolios"
      description="Manage project portfolios"
      createLabel="New Portfolio"
      columns={[
        { header: 'Name', accessor: (r) => r.name },
        { header: 'Status', accessor: (r) => r.status ?? '—' },
        { header: 'Created', accessor: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
      ]}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
      list={async () => {
        const res = await projectManagementApi.getPortfolios()
        if (res.error) throw new Error(res.error)
        return normalizeList(res.data)
      }}
      create={(body) => mutateOk(projectManagementApi.createPortfolio(body))}
      update={(id, body) => mutateOk(projectManagementApi.updatePortfolio(id, body))}
    />
  )
}
