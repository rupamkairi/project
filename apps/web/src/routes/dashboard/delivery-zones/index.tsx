import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader } from "@/components/shared";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mockDeliveryZones, type MockDeliveryZone } from "@/lib/mock-data";
import { Plus, MapPin, Power } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/delivery-zones/",
  component: DeliveryZones,
});

function DeliveryZones() {
  const navigate = useNavigate();
  const [zones, setZones] = useState(mockDeliveryZones);

  const toggleZone = (id: string) => {
    setZones(
      zones.map((z) => (z.id === id ? { ...z, enabled: !z.enabled } : z)),
    );
  };

  const columns: ColumnDef<MockDeliveryZone>[] = [
    {
      accessorKey: "name",
      header: "Zone Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-sm text-muted-foreground">
              {row.original.description}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "fee",
      header: "Shipping Fee",
      cell: ({ row }) => <span>${(row.original.fee / 100).toFixed(2)}</span>,
    },
    {
      accessorKey: "freeShippingThreshold",
      header: "Free Shipping Over",
      cell: ({ row }) => (
        <span>${(row.original.freeShippingThreshold / 100).toFixed(2)}</span>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleZone(row.original.id)}
        >
          <Power
            className={`h-4 w-4 mr-2 ${row.original.enabled ? "text-green-600" : "text-gray-400"}`}
          />
          {row.original.enabled ? "Enabled" : "Disabled"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Zones"
        description="Configure shipping zones and rates"
        actions={
          <Button
            onClick={() => navigate({ to: "/dashboard/delivery-zones/new" })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Zone
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Zones</p>
            <p className="text-2xl font-bold">{zones.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Zones</p>
            <p className="text-2xl font-bold">
              {zones.filter((z) => z.enabled).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pincodes Covered</p>
            <p className="text-2xl font-bold">
              {zones.reduce((sum, z) => sum + z.pincodes.length, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={zones}
        searchPlaceholder="Search zones..."
      />
    </div>
  );
}
