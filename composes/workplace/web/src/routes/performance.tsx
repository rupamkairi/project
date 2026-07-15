import { createRoute } from '@tanstack/react-router'
import { Route as WorkplaceLayoutRoute } from './layout'
import { Card, CardHeader, CardTitle, CardContent } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/performance',
  component: PerformancePage,
})

function PerformancePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Performance</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Track individual and department goals.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Manage review cycles and feedback.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
