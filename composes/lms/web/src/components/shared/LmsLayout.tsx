import { Outlet } from "@tanstack/react-router"
import {
  NavBar,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@projectx/ui"
import type { NavBarItem } from "@projectx/ui"
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Award,
  Compass,
  BarChart3,
  Users,
  UserCheck,
  Tag,
  Settings,
  LogOut,
} from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { useLmsAuthStore } from "../../stores/auth-store"

const NAV_ITEMS: Record<string, NavBarItem[]> = {
  learner: [
    { label: "Dashboard", href: "/lms/learn/dashboard", icon: LayoutDashboard },
    { label: "Catalog", href: "/lms/learn/catalog", icon: Compass },
    { label: "Certificates", href: "/lms/learn/certificates", icon: Award },
  ],
  instructor: [
    { label: "Dashboard", href: "/lms/teach/dashboard", icon: LayoutDashboard },
    { label: "My Courses", href: "/lms/teach/courses", icon: BookOpen },
    { label: "Analytics", href: "/lms/teach/analytics", icon: BarChart3 },
  ],
  admin: [
    { label: "Dashboard", href: "/lms/admin/dashboard", icon: LayoutDashboard },
    { label: "Courses", href: "/lms/admin/courses", icon: BookOpen },
    { label: "Enrollments", href: "/lms/admin/enrollments", icon: Users },
    { label: "Instructors", href: "/lms/admin/instructors", icon: UserCheck },
    { label: "Analytics", href: "/lms/admin/analytics", icon: BarChart3 },
    { label: "Coupons", href: "/lms/admin/coupons", icon: Tag },
    { label: "Settings", href: "/lms/admin/config", icon: Settings },
  ],
}

const APP_BACK_LINKS: Record<string, NavBarItem> = {
  learner: { label: "Back to Dashboard", href: "/dashboard", icon: LayoutDashboard },
  instructor: { label: "Back to Dashboard", href: "/dashboard", icon: LayoutDashboard },
  admin: { label: "Back to Dashboard", href: "/dashboard", icon: LayoutDashboard },
}

function UserMenu() {
  const navigate = useNavigate()
  const { actor, clear } = useLmsAuthStore()

  const initials =
    [actor?.name?.[0]].filter(Boolean).join("").toUpperCase() || "?"
  const fullName = actor?.name || "User"

  const handleLogout = () => {
    localStorage.removeItem("platform_token")
    clear()
    navigate({ to: "/login" })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent outline-none">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground">{fullName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actor && (
          <>
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-foreground">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{actor.email}</p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Main Dashboard
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface LmsLayoutProps {
  app: "learner" | "instructor" | "admin"
}

export function LmsLayout({ app }: LmsLayoutProps) {
  const items = NAV_ITEMS[app] ?? []
  const backLink = APP_BACK_LINKS[app]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <NavBar items={[backLink, ...items]} actions={<UserMenu />} />
      <main className="flex-1">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
