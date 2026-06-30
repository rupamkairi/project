import { createRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { sharedRootRoute } from "@projectx/shared-router";
import { NavBar } from "@projectx/ui";
import {
  ShoppingCart,
  TrendingUp,
  Package,
  DollarSign,
  Factory,
  Users,
  CreditCard,
  FileText,
  LayoutDashboard,
} from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/erp",
  component: ErpLayout,
});

const NAV_ITEMS = [
  { label: "Dashboard", href: "/erp", icon: LayoutDashboard, exact: true },
  { label: "Procurement", href: "/erp/procurement", icon: ShoppingCart },
  { label: "Sales", href: "/erp/sales", icon: TrendingUp },
  { label: "Inventory", href: "/erp/inventory", icon: Package },
  { label: "Finance", href: "/erp/finance", icon: DollarSign },
  { label: "Manufacturing", href: "/erp/manufacturing", icon: Factory },
  { label: "HR", href: "/erp/hr", icon: Users },
  { label: "Payroll", href: "/erp/payroll", icon: CreditCard },
  { label: "Tax / GST", href: "/erp/tax", icon: FileText },
];

function ErpLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <NavBar items={NAV_ITEMS} />
      <main className="flex-1 container mx-auto py-6 px-4">
        <Outlet />
      </main>
    </div>
  );
}
