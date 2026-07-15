import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/rooms',
  component: RoomsPage,
})

function RoomsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Rooms</h1>
      <p className="text-muted-foreground">
        View room inventory, status, and assignments across properties.
      </p>
    </div>
  )
}
