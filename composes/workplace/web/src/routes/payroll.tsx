import { createRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Route as WorkplaceLayoutRoute } from './layout'
import { useWorkplaceStore } from '../stores/index'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@projectx/ui'
import { workplaceApi } from '../lib/api/index'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/payroll',
  component: PayrollPage,
})

function PayrollPage() {
  const { payrollRuns, loading, fetchPayrollRuns } = useWorkplaceStore()

  useEffect(() => {
    fetchPayrollRuns()
  }, [])

  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const handleCreateRun = async () => {
    await workplaceApi.payrollRuns.create({ year: now.getFullYear(), month: now.getMonth() + 1 })
    fetchPayrollRuns()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payroll</h1>
        <Button size="sm" onClick={handleCreateRun}>
          New Payroll Run
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{payrollRuns.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Period</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{currentPeriod}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {payrollRuns.find((e: any) => e.period === currentPeriod)
                ? 'Run created'
                : 'Not started'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last Net Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {payrollRuns[0]?.totalNet
                ? `₹${Number(payrollRuns[0].totalNet).toLocaleString()}`
                : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : payrollRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payroll runs.</p>
          ) : (
            <div className="divide-y">
              {payrollRuns.map((entry: any) => (
                <div key={entry.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{entry.period}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.employeeCount ?? 0} employees
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        ₹{Number(entry.totalNet ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Net pay</p>
                    </div>
                    <Badge variant={entry.status === 'approved' ? 'default' : 'secondary'}>
                      {entry.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
