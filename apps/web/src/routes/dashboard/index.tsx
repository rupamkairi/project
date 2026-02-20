import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../__dashboard";
import { PageHeader, StatusBadge, MoneyDisplay } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mockDashboardStats,
  mockSalesData,
  mockOrders,
  mockInventory,
} from "@/lib/mock-data";
import {
  ArrowDownRight,
  ArrowUpRight,
  PackageOpen,
  ShoppingCart,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/",
  component: DashboardIndex,
});

function DashboardIndex() {
  const recentOrders = mockOrders.slice(0, 5);
  const lowStockItems = mockInventory.filter(
    (i) => i.available <= i.reorderPoint,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's an overview of your store."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={<MoneyDisplay amount={mockDashboardStats.totalRevenue} />}
          change={mockDashboardStats.revenueChange}
          icon={DollarSign}
        />
        <StatCard
          title="Orders Today"
          value={mockDashboardStats.ordersToday.toString()}
          change={mockDashboardStats.ordersChange}
          icon={ShoppingCart}
        />
        <StatCard
          title="Active Orders"
          value={mockDashboardStats.activeOrders.toString()}
          change={mockDashboardStats.activeChange}
          icon={TrendingUp}
        />
        <StatCard
          title="Low Stock Alerts"
          value={mockDashboardStats.lowStockCount.toString()}
          change={mockDashboardStats.lowStockChange}
          icon={PackageOpen}
          invertColors
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockSalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{order.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <p className="text-sm text-muted-foreground mt-1">
                      <MoneyDisplay amount={order.total} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Low Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lowStockItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.variantName} - {item.sku}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.available} units</p>
                  <p className="text-sm text-destructive">
                    Below {item.reorderPoint}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  invertColors = false,
}: {
  title: string;
  value: React.ReactNode;
  change: number;
  icon: React.ElementType;
  invertColors?: boolean;
}) {
  const isPositive = change >= 0;
  const showPositive = invertColors ? !isPositive : isPositive;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-2 flex items-end gap-2">
          <p className="text-2xl font-bold">{value}</p>
          <span
            className={`text-xs font-medium flex items-center ${
              showPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(change)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
