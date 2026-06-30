import { createRoute } from "@tanstack/react-router";
import { ecommerceAdminLayoutRoute } from "./admin.layout";
import { PageHeader } from "@projectx/ui";
import { useQuery } from "@tanstack/react-query";
import { ecommerceAdminApi } from "../lib/api";
import { formatCurrency } from "../lib/format";

function AdminDashboard() {
  const { data: analyticsData } = useQuery({ queryKey: ["admin-analytics"], queryFn: () => ecommerceAdminApi.getAnalytics() });
  const { data: ordersData } = useQuery({ queryKey: ["admin-orders"], queryFn: () => ecommerceAdminApi.getOrders({ limit: 5 }) });

  const analytics = analyticsData?.data ?? {};
  const orders = ordersData?.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Ecommerce overview" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[{ label: "GMV", value: analytics.gmv ?? 0, delta: "+18%" }, { label: "Orders", value: analytics.orderCount ?? 0, delta: "+12%" }, { label: "AOV", value: analytics.aov ?? 0, delta: "+5%" }, { label: "Return Rate", value: analytics.returnRate ?? "0%", delta: "-1%" }].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1">{typeof kpi.value === "number" ? formatCurrency(kpi.value) : kpi.value}</p>
            <p className="text-xs mt-1 text-green-600">{kpi.delta}</p>
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">Recent Orders</h3>
        <div className="rounded-lg border">
          {orders.length === 0 ? <p className="text-sm text-muted-foreground p-4">No orders yet</p> : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr><th className="p-3 font-medium">Order</th><th className="p-3 font-medium">Customer</th><th className="p-3 font-medium">Total</th><th className="p-3 font-medium">Status</th></tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id} className="border-b last:border-0"><td className="p-3">{o.referenceNo}</td><td className="p-3">{o.person?.email ?? "—"}</td><td className="p-3">{formatCurrency(o.totalAmount)}</td><td className="p-3">{o.status}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export const ecommerceAdminIndexRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/",
  component: AdminDashboard,
});
