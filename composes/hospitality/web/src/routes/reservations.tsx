import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/reservations',
  component: ReservationsPage,
})

function ReservationsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reservations</h1>
      <p className="text-muted-foreground">
        Manage check-ins, check-outs, holds, and room assignments.
      </p>
    </div>
  )
}
