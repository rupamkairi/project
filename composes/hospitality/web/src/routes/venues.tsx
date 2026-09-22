import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'
import { hospitalityApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/venues',
  component: VenuesPage,
})

function VenuesPage() {
  return (
    <CrudTablePage
      title="Venues"
      description="Event spaces."
      createLabel="Add Venue"
      columns={[
        { header: 'Name', accessor: (r) => r.name },
        { header: 'Capacity', accessor: (r) => String(r.capacity ?? '—') },
        { header: 'Status', accessor: (r) => r.status ?? '—' },
      ]}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'capacity', label: 'Capacity', type: 'number' },
      ]}
      list={async () => normalizeList(await hospitalityApi.getVenues())}
      create={(body) => mutateOk(hospitalityApi.createVenue(body))}
      update={(id, body) => mutateOk(hospitalityApi.updateVenue(id, body))}
    />
  )
}
