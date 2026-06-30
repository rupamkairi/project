import { createRoute } from "@tanstack/react-router";
import { ecommerceAdminLayoutRoute } from "../admin.layout";
import { PageHeader } from "@projectx/ui";
import { useQuery } from "@tanstack/react-query";
import { ecommerceAdminApi } from "../../lib/api";
import { formatCurrency } from "../../../../storefront/src/lib/format";
import { ShoppingBag, CreditCard, TrendingUp, Users, Package, ArrowUpRight } from "lucide-react";

export const ecoAdminAnalyticsRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/analytics",
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const { data: dashboard } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => ecommerceAdminApi.getDashboard(),
  });

  const stats = dashboard?.data ?? {};

  const cards = [
    { label: "Revenue", value: formatCurrency(stats.totalRevenue ?? stats.revenue ?? 0), icon: CreditCard, color: "text-green-600" },
    { label: "Orders", value: String(stats.totalOrders ?? stats.orders ?? 0), icon: ShoppingBag, color: "text-blue-600" },
    { label: "Customers", value: String(stats.totalCustomers ?? stats.customers ?? 0), icon: Users, color: "text-purple-600" },
    { label: "Products", value: String(stats.totalProducts ?? stats.products ?? 0), icon: Package, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Analytics" />
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
