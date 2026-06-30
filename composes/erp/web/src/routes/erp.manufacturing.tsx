import { createRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Route as ErpLayoutRoute } from "./erp.layout";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@projectx/ui";
import { erpApi } from "../lib/api/erp";

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: "/manufacturing",
  component: ManufacturingPage,
});

function ManufacturingPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      erpApi.manufacturing.dashboard(),
      erpApi.workOrders.list(),
      erpApi.boms.list(),
    ]).then(([d, wo, b]: any[]) => {
      setDashboard((d as any).data);
      setWorkOrders(((wo as any).data?.workOrders ?? []) as any[]);
      setBoms(((b as any).data?.boms ?? []) as any[]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Manufacturing</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Open WOs</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dashboard?.open ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">In Progress</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{dashboard?.inProgress ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Completed</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{dashboard?.completed ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">BOMs</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{boms.length}</p>
          </CardContent>
        </Card>
      </div>

      {dashboard?.shortages?.length > 0 && (
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive text-base">Material Shortages</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {dashboard.shortages.map((s: any, i: number) => (
                <div key={i} className="py-1.5 flex items-center justify-between text-sm">
                  <span>{s.itemId}</span>
                  <span className="text-destructive">Short: {s.shortfall}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Work Orders</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : workOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No work orders.</p>
          ) : (
            <div className="divide-y">
              {workOrders.map((wo: any) => (
                <div key={wo.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{wo.refNo}</p>
                    <p className="text-xs text-muted-foreground">Qty: {wo.plannedQty}</p>
                  </div>
                  <Badge variant={wo.status === "completed" ? "default" : "secondary"}>{wo.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
