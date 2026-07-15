import { createRoute } from '@tanstack/react-router'
import { Route as WorkplaceLayoutRoute } from './layout'
import { Card, CardHeader, CardTitle, CardContent } from '@projectx/ui'
import {
  Briefcase,
  UserPlus,
  Users,
  Clock,
  TrendingUp,
  CreditCard,
  Receipt,
  Building2,
  BarChart,
  User,
  Settings,
} from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => WorkplaceLayoutRoute,
  path: '/',
  component: WorkplaceDashboard,
})

const MODULES = [
  {
    label: 'Recruitment',
    href: '/workplace/recruitment',
    icon: Briefcase,
    desc: 'Job openings, applications, interviews',
  },
  {
    label: 'Onboarding',
    href: '/workplace/onboarding',
    icon: UserPlus,
    desc: 'New hire onboarding workflows',
  },
  {
    label: 'People',
    href: '/workplace/people',
    icon: Users,
    desc: 'Employees, departments, positions',
  },
  {
    label: 'Time & Leave',
    href: '/workplace/time',
    icon: Clock,
    desc: 'Leave, attendance, timesheets',
  },
  {
    label: 'Performance',
    href: '/workplace/performance',
    icon: TrendingUp,
    desc: 'Goals, reviews, feedback',
  },
  {
    label: 'Payroll',
    href: '/workplace/payroll',
    icon: CreditCard,
    desc: 'Salary structures, payroll runs',
  },
  {
    label: 'Expenses',
    href: '/workplace/expenses',
    icon: Receipt,
    desc: 'Expense claims and items',
  },
  {
    label: 'Office',
    href: '/workplace/office',
    icon: Building2,
    desc: 'Assets, policies, visitors, rooms',
  },
  {
    label: 'Reports',
    href: '/workplace/reports',
    icon: BarChart,
    desc: 'Headcount, attendance, payroll reports',
  },
  { label: 'My Workplace', href: '/workplace/my', icon: User, desc: 'Self-service and approvals' },
  {
    label: 'Settings',
    href: '/workplace/settings',
    icon: Settings,
    desc: 'Organization, leave policy, payroll config',
  },
]

function WorkplaceDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Workplace Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {MODULES.map((m) => (
          <a key={m.href} href={m.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <m.icon className="h-6 w-6 text-muted-foreground mb-1" />
                <CardTitle className="text-base">{m.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  )
}
