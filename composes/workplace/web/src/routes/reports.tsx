import { createRoute } from '@tanstack/react-router'
import { Route as WorkplaceLayoutRoute } from './layout'
import { Card, CardHeader, CardTitle, CardContent } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/reports',
  component: ReportsPage,
})

function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Headcount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Employee count by department, type, and status.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Monthly attendance reports.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payroll Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Gross/net totals per payroll run.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Leave types utilization across organization.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Expense claims by category and department.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
