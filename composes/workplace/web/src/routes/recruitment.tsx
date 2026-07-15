import { createRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Route as WorkplaceLayoutRoute } from './layout'
import { useWorkplaceStore } from '../stores/index'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@projectx/ui'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/recruitment',
  component: RecruitmentPage,
})

function RecruitmentPage() {
  const { jobOpenings, applications, loading, fetchJobOpenings, fetchApplications } =
    useWorkplaceStore()

  useEffect(() => {
    fetchJobOpenings()
    fetchApplications()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Recruitment</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {jobOpenings.filter((j: any) => j.status === 'open').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{applications.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">—</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Openings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : jobOpenings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No job openings.</p>
          ) : (
            <div className="divide-y">
              {jobOpenings.map((job: any) => (
                <div key={job.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.employmentType} · {job.headCount} openings
                    </p>
                  </div>
                  <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                    {job.status}
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
