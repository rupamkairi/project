import { createRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Route as ErpLayoutRoute } from "./erp.layout";
import { useErpStore } from "../stores/erp";
import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, Button,
} from "@projectx/ui";

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: "/procurement",
  component: ProcurementPage,
});

function ProcurementPage() {
  const { vendors, purchaseOrders, loading, fetchVendors, fetchPurchaseOrders } = useErpStore();

  useEffect(() => {
    fetchVendors();
    fetchPurchaseOrders();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Procurement</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{vendors.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{purchaseOrders.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total POs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {purchaseOrders.filter((o: any) => o.status === "submitted").length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : purchaseOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase orders.</p>
          ) : (
            <div className="divide-y">
              {purchaseOrders.map((po: any) => (
                <div key={po.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{po.refNo}</p>
                    <p className="text-xs text-muted-foreground">{po.vendorId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">₹{Number(po.total ?? 0).toLocaleString()}</span>
                    <Badge variant={po.status === "approved" ? "default" : "secondary"}>
                      {po.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : vendors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vendors registered.</p>
          ) : (
            <div className="divide-y">
              {vendors.map((v: any) => (
                <div key={v.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.meta?.gstin ?? "No GSTIN"}</p>
                  </div>
                  <Badge variant={v.meta?.status === "blacklisted" ? "destructive" : "outline"}>
                    {v.meta?.status ?? "active"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
