import { createRoute } from "@tanstack/react-router";
import { Route as ErpLayoutRoute } from "./erp.layout";
import { Card, CardHeader, CardTitle, CardContent } from "@projectx/ui";
import {
  ShoppingCart,
  TrendingUp,
  Package,
  DollarSign,
  Factory,
  Users,
  CreditCard,
  FileText,
} from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: "/",
  component: ErpDashboard,
});

const MODULES = [
  { label: "Procurement", href: "/erp/procurement", icon: ShoppingCart, desc: "Vendors, POs, GRNs, invoices" },
  { label: "Sales", href: "/erp/sales", icon: TrendingUp, desc: "Customers, orders, delivery, invoicing" },
  { label: "Inventory", href: "/erp/inventory", icon: Package, desc: "Items, warehouses, stock ledger" },
  { label: "Finance", href: "/erp/finance", icon: DollarSign, desc: "GL, journal entries, reports" },
  { label: "Manufacturing", href: "/erp/manufacturing", icon: Factory, desc: "BOMs, work orders, production" },
  { label: "HR", href: "/erp/hr", icon: Users, desc: "Employees, leave, attendance" },
  { label: "Payroll", href: "/erp/payroll", icon: CreditCard, desc: "Salary structures, payroll runs" },
  { label: "Tax / GST", href: "/erp/tax", icon: FileText, desc: "GST templates, GSTR-1, GSTR-3B" },
];

function ErpDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">ERP Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
  );
}
