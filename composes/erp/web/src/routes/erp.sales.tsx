import { createRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Route as ErpLayoutRoute } from "./erp.layout";
import { useErpStore } from "../stores/erp";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@projectx/ui";

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: "/sales",
  component: SalesPage,
});

function SalesPage() {
  const { customers, salesOrders, loading, fetchCustomers, fetchSalesOrders } = useErpStore();

  useEffect(() => {
    fetchCustomers();
    fetchSalesOrders();
  }, []);

  const totalRevenue = salesOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sales</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Customers</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{customers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Sales Orders</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{salesOrders.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Confirmed orders</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Sales Orders</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : salesOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales orders.</p>
          ) : (
            <div className="divide-y">
              {salesOrders.map((so: any) => (
                <div key={so.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{so.refNo}</p>
                    <p className="text-xs text-muted-foreground">{so.customerId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">₹{Number(so.total ?? 0).toLocaleString()}</span>
                    <Badge variant={so.status === "confirmed" ? "default" : "secondary"}>{so.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customers</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No customers.</p>
          ) : (
            <div className="divide-y">
              {customers.map((c: any) => (
                <div key={c.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.meta?.gstin ?? "No GSTIN"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Credit: ₹{Number(c.meta?.creditLimit ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
