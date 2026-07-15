import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/guests',
  component: GuestsPage,
})

function GuestsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Guests</h1>
      <p className="text-muted-foreground">Manage guest profiles, preferences, and stay history.</p>
    </div>
  )
}
