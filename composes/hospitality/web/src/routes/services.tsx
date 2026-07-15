import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/services',
  component: ServicesPage,
})

function ServicesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Services</h1>
      <p className="text-muted-foreground">Manage service catalog and guest service requests.</p>
    </div>
  )
}
