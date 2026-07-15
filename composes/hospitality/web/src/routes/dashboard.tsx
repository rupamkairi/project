import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/',
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Hospitality Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Arrivals" value="--" />
        <StatCard title="Today's Departures" value="--" />
        <StatCard title="In-House Guests" value="--" />
        <StatCard title="Occupancy" value="--%" />
      </div>
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Recent Reservations</h2>
          <p className="text-sm text-muted-foreground">No reservations yet.</p>
        </div>
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Housekeeping Status</h2>
          <p className="text-sm text-muted-foreground">No tasks pending.</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}
