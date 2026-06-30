import { createRoute } from "@tanstack/react-router"
import { Outlet, useNavigate } from "@tanstack/react-router"
import { useAuthStore } from "../stores/auth"
import { AuthGuard } from "../components/auth-guard"
import { sharedRootRoute } from "@projectx/shared-router"
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
  Gauge,
  Users,
  Building2,
  MapPin,
  Receipt,
  GitBranch,
  Activity as ActivityIcon,
  Shield,
  Mail,
  Bell,
  FolderOpen,
  LogOut,
} from "lucide-react"
import { platformNavItems } from "@projectx/shared-router"

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/dashboard",
  beforeLoad: () => {
    const { isAuthenticated, isLoading } = useAuthStore.getState()
    if (!isLoading && !isAuthenticated) {
      throw new Error("UNAUTHENTICATED")
    }
  },
  component: DashboardLayout,
})

const NAV_ITEMS: NavBarItem[] = [...platformNavItems]

function UserMenu() {
  const { actor, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate({ to: "/login" })
  }

  const initials =
    [actor?.firstName?.[0], actor?.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?"

  const fullName =
    [actor?.firstName, actor?.lastName].filter(Boolean).join(" ") || "User"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent outline-none">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-sm font-medium text-foreground">
            {fullName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-foreground">{fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{actor?.email}</p>
        </div>
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

function DashboardLayout() {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <NavBar
          items={NAV_ITEMS}
          actions={<UserMenu />}
        />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </AuthGuard>
  )
}
