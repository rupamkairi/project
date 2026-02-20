import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockInventory } from "@/lib/mock-data";
import { AlertTriangle, Package } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/inventory/low-stock",
  component: LowStockAlerts,
});

function LowStockAlerts() {
  const lowStockItems = mockInventory.filter(
    (i) => i.available <= i.reorderPoint,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Low Stock Alerts"
        description="Items that need to be reordered"
      />

      <div className="grid gap-4">
        {lowStockItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                All stock levels are healthy
              </p>
              <p className="text-muted-foreground">
                No items are below their reorder point
              </p>
            </CardContent>
          </Card>
        ) : (
          lowStockItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.variantName} - {item.sku}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-destructive">
                      {item.available}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      of {item.reorderPoint} reorder point
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Create PO
                    </Button>
                    <Button size="sm">Adjust</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
