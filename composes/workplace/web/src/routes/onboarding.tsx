import { createRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Route as WorkplaceLayoutRoute } from './layout'
import { useWorkplaceStore } from '../stores/index'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@projectx/ui'
import { workplaceApi } from '../lib/api/index'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/onboarding',
  component: OnboardingPage,
})

function OnboardingPage() {
  const { employees, loading, fetchEmployees } = useWorkplaceStore()
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [workflowData, setWorkflowData] = useState<any>(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (selectedEmployee) {
      workplaceApi.onboarding?.workflow?.(selectedEmployee).then((res: any) => {
        if (res.data) setWorkflowData(res.data)
      })
    }
  }, [selectedEmployee])

  const preboarding = employees.filter((e: any) => e.employmentStatus === 'preboarding')
  const offboarding = employees.filter((e: any) => e.employmentStatus === 'terminated')

  const handleCompleteTask = async (taskId: string) => {
    if (!selectedEmployee) return
    await workplaceApi.onboarding?.completeTask?.(selectedEmployee, { taskId })
    const res = (await workplaceApi.onboarding?.workflow?.(selectedEmployee)) as any
    if (res?.data) setWorkflowData(res.data)
    fetchEmployees()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Onboarding</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Preboarding list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preboarding ({preboarding.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : preboarding.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees in preboarding.</p>
            ) : (
              <div className="divide-y">
                {preboarding.map((emp: any) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp.id)}
                    className={`w-full text-left py-2 px-2 rounded ${
                      selectedEmployee === emp.id ? 'bg-muted' : ''
                    }`}
                  >
                    <p className="text-sm font-medium">{emp.employeeCode ?? emp.id}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined: {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : '—'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Onboarding Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedEmployee ? (
              <p className="text-sm text-muted-foreground">Select an employee to view tasks.</p>
            ) : !workflowData?.tasks?.length ? (
              <p className="text-sm text-muted-foreground">No onboarding workflow tasks.</p>
            ) : (
              <div className="divide-y">
                {workflowData.tasks.map((task: any) => (
                  <div key={task.id} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.assigneeRole && (
                        <p className="text-xs text-muted-foreground">Role: {task.assigneeRole}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                        {task.status}
                      </Badge>
                      {task.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompleteTask(task.id)}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Offboarding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Offboarding ({offboarding.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {offboarding.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees in offboarding.</p>
          ) : (
            <div className="divide-y">
              {offboarding.slice(0, 10).map((emp: any) => (
                <div key={emp.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{emp.employeeCode ?? emp.id}</p>
                    <p className="text-xs text-muted-foreground">
                      Terminated:{' '}
                      {emp.terminationDate
                        ? new Date(emp.terminationDate).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                  <Badge variant="secondary">{emp.terminationReason ?? '—'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
