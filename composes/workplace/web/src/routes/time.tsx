import { createRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Route as WorkplaceLayoutRoute } from './layout'
import { useWorkplaceStore } from '../stores/index'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/time',
  component: TimePage,
})

function TimePage() {
  const { leaveRequests, leaveTypes, loading, fetchLeaveRequests, fetchLeaveTypes } =
    useWorkplaceStore()

  useEffect(() => {
    fetchLeaveRequests()
    fetchLeaveTypes()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Time & Leave</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave Types</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{leaveTypes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {leaveRequests.filter((r: any) => r.status === 'submitted').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Absentees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">—</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : leaveRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requests.</p>
          ) : (
            <div className="divide-y">
              {leaveRequests.map((lr: any) => (
                <div key={lr.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{lr.days} days</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(lr.fromDate).toLocaleDateString()} →{' '}
                      {new Date(lr.toDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      lr.status === 'approved'
                        ? 'default'
                        : lr.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {lr.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
