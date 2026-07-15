import { createRoute } from '@tanstack/react-router'
import { Route as WorkplaceLayoutRoute } from './layout'
import { Card, CardHeader, CardTitle, CardContent } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/my',
  component: MyWorkplacePage,
})

function MyWorkplacePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Workplace</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Remaining leave days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Recent payslips</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Pending manager approvals</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Company-wide announcements and updates.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Policies</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Active workplace policies requiring acknowledgement.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
