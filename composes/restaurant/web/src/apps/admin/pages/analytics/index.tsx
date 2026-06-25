import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@projectx/ui";
import { rstApi } from "../../../../lib/api/restaurant";
import { useOutletStore } from "../../../../stores/outlet-store";
import { AmountDisplay } from "../../../../components/shared/AmountDisplay";

type Period = "today" | "week" | "month";

function SimpleBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-primary/20 rounded-t transition-all"
            style={{ height: `${(d.value / max) * 80}px` }}
          />
          <span className="text-xs text-muted-foreground truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminAnalyticsPage() {
  const { outletId } = useOutletStore();
  const [period, setPeriod] = useState<Period>("today");

  const { data, isLoading } = useQuery({
    queryKey: ["rst-analytics", outletId, period],
    queryFn: () => rstApi.getAnalytics({ outletId: outletId!, period }),
    enabled: !!outletId,
    refetchInterval: 120_000,
  });

  const analytics = data?.data ?? {};

  const hourlyData = (analytics.hourly ?? []).map((h: any) => ({
    label: `${h.hour}h`,
    value: h.revenue ?? 0,
  }));

  const dailyData = (analytics.daily ?? []).map((d: any) => ({
    label: d.day,
    value: d.revenue ?? 0,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <div className="flex gap-2">
          {(["today", "week", "month"] as Period[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              onClick={() => setPeriod(p)}
              className="capitalize"
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Revenue", value: <AmountDisplay amount={analytics.totalRevenue} /> },
              { label: "Orders", value: analytics.totalOrders ?? 0 },
              { label: "Avg Order", value: <AmountDisplay amount={analytics.avgOrderValue} /> },
              { label: "Cancelled", value: analytics.cancelled ?? 0 },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {period === "today" && hourlyData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Revenue by Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={hourlyData} />
              </CardContent>
            </Card>
          )}

          {period !== "today" && dailyData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Revenue by Day</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={dailyData} />
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment methods */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(analytics.paymentMethods ?? []).map((pm: any) => (
                  <div key={pm.method} className="flex justify-between text-sm">
                    <span className="capitalize">{pm.method}</span>
                    <span className="font-mono"><AmountDisplay amount={pm.total} /></span>
                  </div>
                ))}
                {(!analytics.paymentMethods || analytics.paymentMethods.length === 0) && (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </CardContent>
            </Card>

            {/* Source breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Order Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "POS", count: analytics.dineIn ?? 0 },
                  { label: "Takeaway", count: analytics.takeaway ?? 0 },
                  { label: "Delivery", count: analytics.delivery ?? 0 },
                  { label: "Aggregators", count: analytics.aggregator ?? 0 },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between text-sm">
                    <span>{s.label}</span>
                    <span className="font-mono">{s.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
