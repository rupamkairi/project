import { createRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Route as ErpLayoutRoute } from "./erp.layout";
import { useErpStore } from "../stores/erp";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@projectx/ui";

export const Route = createRoute({
  getParentRoute: () => ErpLayoutRoute,
  path: "/inventory",
  component: InventoryPage,
});

function InventoryPage() {
  const { items, warehouses, loading, fetchItems, fetchWarehouses } = useErpStore();

  useEffect(() => {
    fetchItems();
    fetchWarehouses();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Inventory</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{items.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Catalog items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Warehouses</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{warehouses.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Storage locations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Low Stock</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">
              {items.filter((i: any) => i.meta?.reorderLevel && Number(i.meta.currentStock ?? 0) <= Number(i.meta.reorderLevel)).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Below reorder level</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items in catalog.</p>
          ) : (
            <div className="divide-y">
              {items.map((item: any) => (
                <div key={item.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.meta?.sku ?? item.id.slice(0, 8)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Stock: {item.meta?.currentStock ?? "—"}
                    </span>
                    {item.meta?.reorderLevel && Number(item.meta?.currentStock ?? 0) <= Number(item.meta.reorderLevel) && (
                      <Badge variant="destructive">Low</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Warehouses</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : warehouses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No warehouses.</p>
          ) : (
            <div className="divide-y">
              {warehouses.map((w: any) => (
                <div key={w.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.meta?.code}</p>
                  </div>
                  <Badge variant="outline">{w.meta?.city ?? "—"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
