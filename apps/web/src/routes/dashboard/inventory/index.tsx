import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader } from "@/components/shared";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { mockInventory, type MockInventory } from "@/lib/mock-data";
import { AlertTriangle, PackageOpen } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/inventory/",
  component: InventoryOverview,
});

function InventoryOverview() {
  const columns: ColumnDef<MockInventory>[] = [
    {
      accessorKey: "productName",
      header: "Product",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.productName}</p>
          <p className="text-sm text-muted-foreground">
            {row.original.variantName}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => (
        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
          {row.original.sku}
        </code>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.location}</Badge>
      ),
    },
    {
      accessorKey: "onHand",
      header: "On Hand",
      cell: ({ row }) => (
        <span
          className={
            row.original.onHand <= row.original.reorderPoint
              ? "text-destructive font-medium"
              : ""
          }
        >
          {row.original.onHand}
        </span>
      ),
    },
    {
      accessorKey: "reserved",
      header: "Reserved",
      cell: ({ row }) => <span>{row.original.reserved}</span>,
    },
    {
      accessorKey: "available",
      header: "Available",
      cell: ({ row }) => (
        <span
          className={
            row.original.available <= row.original.reorderPoint
              ? "text-destructive font-medium"
              : ""
          }
        >
          {row.original.available}
        </span>
      ),
    },
    {
      accessorKey: "reorderPoint",
      header: "Reorder Point",
      cell: ({ row }) => <span>{row.original.reorderPoint}</span>,
    },
  ];

  const lowStockCount = mockInventory.filter(
    (i) => i.available <= i.reorderPoint,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Track and manage stock levels across locations"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/dashboard/inventory/adjust">Adjust Stock</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard/inventory/transfer">Transfer</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard/inventory/low-stock">
                Low Stock ({lowStockCount})
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{mockInventory.length}</p>
              </div>
              <PackageOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total On Hand</p>
                <p className="text-2xl font-bold">
                  {mockInventory.reduce((sum, i) => sum + i.onHand, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reserved</p>
                <p className="text-2xl font-bold">
                  {mockInventory.reduce((sum, i) => sum + i.reserved, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-destructive">
                  {lowStockCount}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={mockInventory}
        searchPlaceholder="Search inventory..."
      />
    </div>
  );
}
