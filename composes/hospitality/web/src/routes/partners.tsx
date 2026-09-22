import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'
import { hospitalityApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/partners',
  component: PartnersPage,
})

function PartnersPage() {
  return (
    <CrudTablePage
      title="Partners"
      description="Channel and service partners."
      createLabel="Add Partner"
      columns={[
        { header: 'Name', accessor: (r) => r.name },
        { header: 'Type', accessor: (r) => r.type ?? '—' },
        { header: 'Status', accessor: (r) => r.status ?? '—' },
      ]}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'type', label: 'Type' },
      ]}
      list={async () => normalizeList(await hospitalityApi.getPartners())}
      create={(body) => mutateOk(hospitalityApi.createPartner(body))}
      update={(id, body) => mutateOk(hospitalityApi.updatePartner(id, body))}
      remove={(id) => mutateOk(hospitalityApi.deletePartner(id))}
    />
  )
}
