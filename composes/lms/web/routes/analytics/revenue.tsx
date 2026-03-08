import { createRoute } from "@tanstack/react-router";
import { Route as lmsLayoutRoute } from "../layout";
import { PageHeader } from "../../components/shared/page-header";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockRevenueData } from "../../lib/mock-data";

export const Route = createRoute({
  getParentRoute: () => lmsLayoutRoute,
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
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Total Realized
            </p>
            <p className="text-2xl font-bold">
              ${totalRealized.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Total Deferred
            </p>
            <p className="text-2xl font-bold">
              ${totalDeferred.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Refund Rate
            </p>
            <p className="text-2xl font-bold">2.3%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Avg. Order Value
            </p>
            <p className="text-2xl font-bold">$89</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
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
        </CardContent>
      </Card>
    </div>
  );
}
