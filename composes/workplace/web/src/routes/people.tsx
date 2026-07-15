import { createRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Route as WorkplaceLayoutRoute } from './layout'
import { useWorkplaceStore } from '../stores/index'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/people',
  component: PeoplePage,
})

function PeoplePage() {
  const { employees, departments, loading, fetchEmployees, fetchDepartments } = useWorkplaceStore()

  useEffect(() => {
    fetchEmployees()
    fetchDepartments()
  }, [])

  const deptMap = Object.fromEntries(departments.map((d: any) => [d.id, d.name]))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">People</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{employees.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active headcount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{departments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">On Leave Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">—</p>
            <p className="text-xs text-muted-foreground mt-1">Fetch from attendance</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees.</p>
          ) : (
            <div className="divide-y">
              {employees.map((emp: any) => (
                <div key={emp.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{emp.employeeCode ?? emp.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {deptMap[emp.departmentId] ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{emp.employmentType}</span>
                    <Badge variant="outline">{emp.employmentStatus}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No departments. Run seed.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {departments.map((d: any) => (
                <div key={d.id} className="rounded-md border px-3 py-2">
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {employees.filter((e: any) => e.departmentId === d.id).length} employees
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
