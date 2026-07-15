import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/partners',
  component: PartnersPage,
})

function PartnersPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Partners</h1>
      <p className="text-muted-foreground">
        Manage OTAs, external restaurants, cab providers, and other partners.
      </p>
    </div>
  )
}
