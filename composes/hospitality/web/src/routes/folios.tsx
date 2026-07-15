import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/folios',
  component: FoliosPage,
})

function FoliosPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Folios</h1>
      <p className="text-muted-foreground">
        Manage guest folios, charges, deposits, refunds, and final invoices.
      </p>
    </div>
  )
}
