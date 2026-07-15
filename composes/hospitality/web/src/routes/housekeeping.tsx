import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/housekeeping',
  component: HousekeepingPage,
})

function HousekeepingPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Housekeeping</h1>
      <p className="text-muted-foreground">
        Manage cleaning queues, assignments, inspections, and maintenance notes.
      </p>
    </div>
  )
}
