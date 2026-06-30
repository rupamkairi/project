import { createRoute } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";
import { NavBar, Avatar, AvatarFallback, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@projectx/ui";
import { AuthGuard, useAuthStore } from "@projectx/platform-web";
import { Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Package, FolderOpen, ShoppingCart, Truck, RotateCcw, Users, BarChart3, Settings } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/ecommerce", icon: LayoutDashboard, exact: true },
  { label: "Products", href: "/admin/ecommerce/products", icon: Package },
  { label: "Categories", href: "/admin/ecommerce/categories", icon: FolderOpen },
  { label: "Orders", href: "/admin/ecommerce/orders", icon: ShoppingCart },
  { label: "Fulfillment", href: "/admin/ecommerce/fulfillment", icon: Truck },
  { label: "Returns", href: "/admin/ecommerce/returns", icon: RotateCcw },
  { label: "Customers", href: "/admin/ecommerce/customers", icon: Users },
  { label: "Analytics", href: "/admin/ecommerce/analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin/ecommerce/settings", icon: Settings },
];

function AdminUserMenu() {
  const { actor, logout } = useAuthStore();
  const initials = actor?.firstName || actor?.lastName
    ? [actor?.firstName?.[0], actor?.lastName?.[0]].filter(Boolean).join("").toUpperCase().slice(0, 2)
    : "AD";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-7 w-7 rounded-full">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EcommerceAdminLayout() {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <NavBar items={NAV_ITEMS} actions={<AdminUserMenu />} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </AuthGuard>
  );
}

export const ecommerceAdminLayoutRoute = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/admin/ecommerce",
  component: EcommerceAdminLayout,
});
