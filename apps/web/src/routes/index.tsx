import { createRoute } from '@tanstack/react-router'
import { ComposeDashboard } from '@projectx/ui'
import { dashboardSections, sharedRootRoute } from '@projectx/shared-router'
import { redirectIfAuthenticated } from '@projectx/plugin-auth-web'

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/',
  beforeLoad: () => redirectIfAuthenticated(),
  component: HomePage,
})

function HomePage() {
  return (
    <ComposeDashboard
      title="Compose entry points"
      description="Pick a compose. Cards are grouped by family so the shell stays uniform across routes."
      sections={dashboardSections}
    />
  )
}
