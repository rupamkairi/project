import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'
import { hospitalityApi } from '../lib/api'
import { CrudTablePage, normalizeList, mutateOk } from '@projectx/ui/admin'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/reservations',
  component: ReservationsPage,
})

function ReservationsPage() {
  return (
    <CrudTablePage
      title="Reservations"
      description="Bookings and stay dates."
      createLabel="Add Reservation"
      columns={[
        { header: 'Guest', accessor: (r) => r.guestId ?? r.guestName ?? '—' },
        { header: 'Check-in', accessor: (r) => r.checkIn ?? r.arrivalDate ?? '—' },
        { header: 'Status', accessor: (r) => r.status ?? '—' },
      ]}
      fields={[
        { key: 'guestId', label: 'Guest ID', required: true },
        { key: 'checkIn', label: 'Check-in' },
        { key: 'checkOut', label: 'Check-out' },
        { key: 'roomId', label: 'Room ID' },
      ]}
      list={async () => normalizeList(await hospitalityApi.getReservations())}
      create={(body) => mutateOk(hospitalityApi.createReservation(body))}
      update={(id, body) => mutateOk(hospitalityApi.updateReservation(id, body))}
    />
  )
}
