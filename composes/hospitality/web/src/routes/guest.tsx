import { createRoute } from '@tanstack/react-router'
import { sharedRootRoute } from '@projectx/shared-router'

export const guestStayRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/hospitality/guest/$token',
  component: GuestStayPage,
})

export const Route = guestStayRoute

function GuestStayPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Guest Stay Portal</h1>
      </header>
      <main className="p-6 max-w-2xl mx-auto">
        <div className="border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Your Stay</h2>
          <div className="space-y-3">
            <p className="text-muted-foreground">Loading reservation details...</p>
          </div>
        </div>
        <div className="border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Current Folio</h2>
          <p className="text-muted-foreground">No charges yet.</p>
        </div>
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">Service Requests</h2>
          <p className="text-muted-foreground">No active service requests.</p>
        </div>
      </main>
    </div>
  )
}
