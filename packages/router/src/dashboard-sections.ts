import {
  Activity,
  Briefcase,
  Building2,
  FileText,
  Bell,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Mail,
  GitBranch,
  MapPin,
  Package,
  Receipt,
  Shield,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

export interface DashboardCard {
  title: string
  description: string
  href: string
  icon: LucideIcon
  count: number
}

export interface DashboardSection {
  title: string
  description?: string
  cards: DashboardCard[]
}

/** The shell-owned registry for the one canonical entry point of each Compose. */
export interface ComposeEntry extends DashboardCard {
  id: string
}

export const platformNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { label: 'Overview', href: '/dashboard/overview', icon: Activity },
  { label: 'Persons', href: '/dashboard/persons', icon: Users },
  { label: 'Parties', href: '/dashboard/parties', icon: Building2 },
  { label: 'Locations', href: '/dashboard/locations', icon: MapPin },
  { label: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
  { label: 'Pipelines', href: '/dashboard/pipelines', icon: GitBranch },
  { label: 'Activities', href: '/dashboard/activities', icon: Activity },
  { label: 'Users', href: '/dashboard/users', icon: Users },
  { label: 'Roles', href: '/dashboard/roles', icon: Shield },
  { label: 'Invites', href: '/dashboard/invites', icon: Mail },
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'Files', href: '/dashboard/files', icon: FileText },
] as const

// Internal Compose surfaces remain in their Compose navigation and are not
// independently exposed by Home or Platform dashboard cards.
export const composeEntries: readonly ComposeEntry[] = [
  {
    id: 'platform',
    title: 'Platform',
    description: 'Platform admin',
    href: '/dashboard',
    icon: LayoutDashboard,
    count: 6,
  },
  {
    id: 'crm',
    title: 'CRM',
    description: 'Customer relationship management',
    href: '/crm',
    icon: Users,
    count: 9,
  },
  {
    id: 'ecommerce',
    title: 'Ecommerce',
    description: 'Store operations',
    href: '/ecommerce',
    icon: ShoppingBag,
    count: 9,
  },
  { id: 'erp', title: 'ERP', description: 'ERP operations', href: '/erp', icon: Package, count: 7 },
  {
    id: 'lms',
    title: 'Learning Management',
    description: 'Learning management',
    href: '/lms',
    icon: GraduationCap,
    count: 4,
  },
  {
    id: 'restaurant',
    title: 'Restaurant Management',
    description: 'Multi-outlet restaurant operations',
    href: '/restaurants',
    icon: UtensilsCrossed,
    count: 5,
  },
  {
    id: 'workplace',
    title: 'Workplace',
    description: 'Recruitment, HR, payroll, expenses, and office management',
    href: '/workplace',
    icon: Briefcase,
    count: 12,
  },
  {
    id: 'hospitality',
    title: 'Hospitality Management',
    description: 'Multi-property hospitality management',
    href: '/hospitality',
    icon: Building2,
    count: 10,
  },
  {
    id: 'project-management',
    title: 'Project Management',
    description: 'Portfolios, projects, work items, sprints, boards, and PSA',
    href: '/projects',
    icon: FolderKanban,
    count: 5,
  },
]

export const dashboardSections: DashboardSection[] = composeEntries.map((entry) => ({
  title: entry.title,
  cards: [entry],
}))
