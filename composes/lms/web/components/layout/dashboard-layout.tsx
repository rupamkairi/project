import { Outlet, Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUIStore, useAuthStore } from "../../lib/store";
import { RoleBadge } from "../shared/status-badge";
import { lmsNavigation } from "../../config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Search, LogOut, ChevronDown } from "lucide-react";
import type { NavigationItem, NavItem, NavGroup } from "../../types";

function isNavGroup(item: NavigationItem): item is NavGroup {
  return "children" in item;
}

function NavItemComponent({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  return (
    <Link
      to={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.name}
    </Link>
  );
}

function NavGroupComponent({
  item,
  locationPathname,
}: {
  item: NavGroup;
  locationPathname: string;
}) {
  const isAnyChildActive = item.children.some(
    (child) =>
      locationPathname === child.href ||
      locationPathname.startsWith(child.href + "/"),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isAnyChildActive
              ? "bg-gray-100 text-gray-900"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-5 w-5" />
            {item.name}
          </div>
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-48">
        {item.children.map((child) => (
          <DropdownMenuItem key={child.href} asChild>
            <Link
              to={child.href}
              className={cn(
                "flex items-center gap-2",
                locationPathname === child.href && "bg-muted",
              )}
            >
              <child.icon className="h-4 w-4" />
              {child.name}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardLayout() {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = "/lms/login";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 items-center justify-center border-b border-gray-200">
            <Link
              to="/lms/dashboard"
              className="text-xl font-bold hover:text-primary"
            >
              LMS Admin
            </Link>
          </div>
          <nav className="p-4 space-y-1">
            {lmsNavigation.map((item, index) => {
              const key = `nav-${index}`;
              if (isNavGroup(item)) {
                return (
                  <NavGroupComponent
                    key={key}
                    item={item}
                    locationPathname={location.pathname}
                  />
                );
              }
              const isActive =
                location.pathname === item.href ||
                (item.href !== "/lms/dashboard" &&
                  location.pathname.startsWith(item.href));
              return (
                <NavItemComponent key={key} item={item} isActive={isActive} />
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={toggleSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1 flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-9 bg-gray-50 border-gray-200"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 border-l border-gray-200 pl-2 ml-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {user?.name?.[0] || "U"}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{user?.name || "User"}</p>
                  <RoleBadge role={user?.role || "lms-admin"} />
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
