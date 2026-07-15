import { createRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Route as projectLayoutRoute } from './layout'
import { projectManagementApi } from '../lib/api'
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/reports',
  component: ReportsPage,
})

function ReportsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await projectManagementApi.getProjects({ limit: '50' })
      if (res.data) {
        const projectList = res.data.data ?? []
        setProjects(projectList)
        if (projectList.length > 0) {
          setSelectedProject(projectList[0].id)
          const healthRes = await projectManagementApi.getProjectHealth(projectList[0].id)
          if (healthRes.data) setReport(healthRes.data)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleProjectChange = async (projectId: string) => {
    setSelectedProject(projectId)
    const res = await projectManagementApi.getProjectHealth(projectId)
    if (res.data) setReport(res.data)
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Reports"
        description="Project health, sprint burndown, workload, and financial reports"
      />

      {projects.length > 0 && (
        <select
          value={selectedProject}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-md border bg-background"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.key}: {p.name}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : report ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{report.progress}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{report.totalItems}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{report.completedItems}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{report.overdueItems}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          Select a project to view reports
        </p>
      )}
    </div>
  )
}
