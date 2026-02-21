import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../__dashboard";
import { PageHeader } from "@/components/lms/page-header";
import { mockRevenueData } from "@/lib/mock-data";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/analytics/revenue",
  component: RevenueAnalytics,
});

function RevenueAnalytics() {
  const totalRealized = mockRevenueData.reduce((sum, d) => sum + d.realized, 0);
  const totalDeferred = mockRevenueData.reduce((sum, d) => sum + d.deferred, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Analytics"
        description="Realized vs deferred revenue over time"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Total Realized
          </p>
          <p className="text-2xl font-bold">
            ${totalRealized.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Total Deferred
          </p>
          <p className="text-2xl font-bold">
            ${totalDeferred.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Refund Rate
          </p>
          <p className="text-2xl font-bold">2.3%</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Avg. Order Value
          </p>
          <p className="text-2xl font-bold">$89</p>
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Revenue Trend</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="realized"
                stackId="1"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.6}
                name="Realized"
              />
              <Area
                type="monotone"
                dataKey="deferred"
                stackId="1"
                stroke="#eab308"
                fill="#eab308"
                fillOpacity={0.6}
                name="Deferred"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
