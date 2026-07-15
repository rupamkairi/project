import { createRoute } from '@tanstack/react-router'
import { hospitalityLayoutRoute } from './layout'

export const Route = createRoute({
  getParentRoute: () => hospitalityLayoutRoute,
  path: '/settings',
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <p className="text-muted-foreground">
        Configure property settings, tax rates, service charges, and user permissions.
      </p>
    </div>
  )
}
