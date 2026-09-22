import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'
import { hospitalityApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/folios',
  component: FoliosPage,
})

function FoliosPage() {
  return (
    <CrudTablePage
      title="Folios"
      description="Guest folios and charges."
      createLabel="Add Folio"
      columns={[
        { header: 'ID', accessor: (r) => r.id },
        { header: 'Reservation', accessor: (r) => r.reservationId ?? '—' },
        { header: 'Status', accessor: (r) => r.status ?? '—' },
      ]}
      fields={[{ key: 'reservationId', label: 'Reservation ID', required: true }]}
      list={async () => normalizeList(await hospitalityApi.getFolios())}
      create={(body) => mutateOk(hospitalityApi.createFolio(body))}
    />
  )
}
