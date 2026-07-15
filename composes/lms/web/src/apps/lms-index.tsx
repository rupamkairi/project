import { createRoute, Link } from '@tanstack/react-router'
import { sharedRootRoute } from '@projectx/shared-router'
import { requireAuth } from '@projectx/plugin-auth-web'
import { PageHeader, Card, CardHeader, CardTitle, CardDescription } from '@projectx/ui'
import { LmsAdminDashboard } from './admin/pages/dashboard'

const actions = [
  {
    label: 'Learner',
    to: '/lms/learn/dashboard',
    description: 'Browse courses and track progress',
  },
  { label: 'Teaching', to: '/lms/teach/dashboard', description: 'Create and manage courses' },
  {
    label: 'Administration',
    to: '/lms/admin/dashboard',
    description: 'Manage courses, enrollments, instructors',
  },
  { label: 'Course Catalog', to: '/lms/learn/catalog', description: 'Public course catalog' },
] as const

function LmsHub() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Learning Management"
        description="Courses, enrollment, learner, instructor, and administration surfaces"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="no-underline">
            <Card className="h-full hover:border-foreground/20 transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{a.label}</CardTitle>
                <CardDescription>{a.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <LmsAdminDashboard />
    </div>
  )
}

export const lmsIndexRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: '/lms',
  beforeLoad: () => requireAuth(),
  component: LmsHub,
})
