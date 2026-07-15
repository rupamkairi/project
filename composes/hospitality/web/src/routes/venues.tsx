import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/venues',
  component: VenuesPage,
})

function VenuesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Venues</h1>
      <p className="text-muted-foreground">
        Manage banquet halls, venue facilities, and reservations.
      </p>
    </div>
  )
}
