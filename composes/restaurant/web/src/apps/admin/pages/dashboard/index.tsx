import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@projectx/ui";
import { rstApi } from "../../../../lib/api/restaurant";
import { useOutletStore } from "../../../../stores/outlet-store";
import { AmountDisplay } from "../../../../components/shared/AmountDisplay";

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function AdminDashboardPage() {
  const { outletId } = useOutletStore();

  const { data: analyticsData } = useQuery({
    queryKey: ["rst-analytics", outletId, "today"],
    queryFn: () => rstApi.getAnalytics({ outletId: outletId!, period: "today" }),
    enabled: !!outletId,
    refetchInterval: 60_000,
  });

  const { data: shiftData } = useQuery({
    queryKey: ["rst-shift-current", outletId],
    queryFn: () => rstApi.getOpenShift(outletId!),
    enabled: !!outletId,
    refetchInterval: 30_000,
  });

  const analytics = analyticsData?.data ?? {};
  const shift = shiftData?.data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        {shift ? (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
            Shift Open · since {shift.openedAt ? new Date(shift.openedAt).toLocaleTimeString() : ""}
          </span>
        ) : (
          <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-1 rounded-full">No open shift</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Revenue"
          value={<AmountDisplay amount={analytics.totalRevenue} />}
          sub="Today"
        />
        <StatCard
          label="Orders"
          value={analytics.totalOrders ?? 0}
          sub={`Avg: `}
        />
        <StatCard
          label="Avg. Order Value"
          value={<AmountDisplay amount={analytics.avgOrderValue} />}
        />
        <StatCard
          label="Covers"
          value={analytics.covers ?? 0}
          sub="Dine-in guests"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order type breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Order Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Dine-in", count: analytics.dineIn ?? 0 },
              { label: "Takeaway", count: analytics.takeaway ?? 0 },
              { label: "Delivery", count: analytics.delivery ?? 0 },
              { label: "Aggregator", count: analytics.aggregator ?? 0 },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-sm w-24">{row.label}</span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${analytics.totalOrders ? (row.count / analytics.totalOrders) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-mono w-8 text-right">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(analytics.topItems ?? []).slice(0, 5).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{item.name}</span>
                <span className="font-mono text-muted-foreground">{item.qty} sold</span>
              </div>
            ))}
            {(!analytics.topItems || analytics.topItems.length === 0) && (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
