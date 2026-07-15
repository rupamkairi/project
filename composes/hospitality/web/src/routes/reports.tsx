import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/reports',
  component: ReportsPage,
})

function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      <p className="text-muted-foreground">
        View occupancy, revenue, cancellations, and operational analytics.
      </p>
    </div>
  )
}
