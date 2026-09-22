import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'
import { hospitalityApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/rooms',
  component: RoomsPage,
})

function RoomsPage() {
  return (
    <CrudTablePage
      title="Rooms"
      description="Room inventory and status."
      createLabel="Add Room"
      columns={[
        { header: 'Number', accessor: (r) => r.number ?? r.name ?? r.id },
        { header: 'Type', accessor: (r) => r.type ?? r.roomType ?? '—' },
        { header: 'Status', accessor: (r) => r.status ?? '—' },
      ]}
      fields={[
        { key: 'number', label: 'Number', required: true },
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' },
      ]}
      defaults={{ status: 'available' }}
      list={async () => normalizeList(await hospitalityApi.getRooms())}
      create={(body) => mutateOk(hospitalityApi.createRoom(body))}
      update={(id, body) => mutateOk(hospitalityApi.updateRoom(id, body))}
      remove={(id) => mutateOk(hospitalityApi.deleteRoom(id))}
    />
  )
}
