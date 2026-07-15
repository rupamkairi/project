import { createRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Route as projectLayoutRoute } from './layout'
import { projectManagementApi } from '../lib/api'
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@projectx/ui'
import { FolderKanban, CheckSquare, Clock, AlertTriangle } from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => projectLayoutRoute,
  path: '/',
  component: ProjectManagementDashboard,
})

export function ProjectManagementDashboard() {
  const [projects, setProjects] = useState<any[]>([])
  const [myWork, setMyWork] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [projectsRes, myWorkRes] = await Promise.all([
        projectManagementApi.getProjects({ limit: '10' }),
        projectManagementApi.getMyWork(),
      ])

      if (projectsRes.data) setProjects(projectsRes.data.data ?? [])
      if (myWorkRes.data) setMyWork(myWorkRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const activeProjects = projects.filter((p) => p.status === 'active').length
  const myWorkCount = myWork?.data?.length ?? 0

  const KPI_CARDS = [
    { label: 'Active Projects', value: activeProjects, icon: FolderKanban },
    { label: 'My Open Tasks', value: myWorkCount, icon: CheckSquare },
    { label: 'Total Projects', value: projects.length, icon: Clock },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Project Management"
        description="Portfolios, projects, work items, and sprints overview"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <p className="text-2xl font-bold">{card.value ?? 0}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Recent Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No projects yet</p>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {p.key}: {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {p.type} · {p.status}
                    </p>
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
