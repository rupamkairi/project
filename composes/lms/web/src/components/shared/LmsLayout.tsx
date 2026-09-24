import { Outlet } from '@tanstack/react-router'
import { UserMenu } from '@projectx/plugin-auth-web'
import { StackedAppLayout } from '@projectx/ui'
import type { NavBarItem } from '@projectx/ui'
import {
  LayoutDashboard,
  BookOpen,
  Award,
  Compass,
  BarChart3,
  Users,
  UserCheck,
  Tag,
  Settings,
} from 'lucide-react'
import { useLmsAuthStore } from '../../stores/auth-store'

const NAV_ITEMS: Record<string, NavBarItem[]> = {
  learner: [
    { label: 'Dashboard', href: '/lms/learn/dashboard', icon: LayoutDashboard },
    { label: 'Catalog', href: '/lms/learn/catalog', icon: Compass },
    { label: 'Certificates', href: '/lms/learn/certificates', icon: Award },
  ],
  instructor: [
    { label: 'Dashboard', href: '/lms/teach/dashboard', icon: LayoutDashboard },
    { label: 'My Courses', href: '/lms/teach/courses', icon: BookOpen },
    { label: 'Analytics', href: '/lms/teach/analytics', icon: BarChart3 },
  ],
  admin: [
    { label: 'Dashboard', href: '/lms/admin/dashboard', icon: LayoutDashboard },
    { label: 'Courses', href: '/lms/admin/courses', icon: BookOpen },
    { label: 'Enrollments', href: '/lms/admin/enrollments', icon: Users },
    { label: 'Instructors', href: '/lms/admin/instructors', icon: UserCheck },
    { label: 'Analytics', href: '/lms/admin/analytics', icon: BarChart3 },
    { label: 'Coupons', href: '/lms/admin/coupons', icon: Tag },
    { label: 'Settings', href: '/lms/admin/config', icon: Settings },
  ],
}

const APP_TITLES: Record<string, string> = {
  learner: 'LMS · Learn',
  instructor: 'LMS · Teach',
  admin: 'LMS · Admin',
}

interface LmsLayoutProps {
  app: 'learner' | 'instructor' | 'admin'
}

export function LmsLayout({ app }: LmsLayoutProps) {
  const { actor, clear } = useLmsAuthStore()
  const items = NAV_ITEMS[app] ?? []

  return (
    <StackedAppLayout
      composeTitle={APP_TITLES[app] ?? 'LMS'}
      composeItems={items}
      userMenu={
        <UserMenu
          displayName={actor?.name}
          email={actor?.email}
          onAfterLogout={clear}
          linkItems={[{ label: 'Main Dashboard', href: '/dashboard', icon: LayoutDashboard }]}
        />
      }
      mainClassName="p-6"
    >
      <Outlet />
    </StackedAppLayout>
  )
}
