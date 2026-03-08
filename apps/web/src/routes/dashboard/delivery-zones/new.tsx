import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/delivery-zones/new",
  component: CreateDeliveryZone,
});

function CreateDeliveryZone() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Delivery Zone"
        description="Define a new delivery zone with coverage and pricing"
        breadcrumbs={[
          { label: "Delivery Zones", href: "/dashboard/delivery-zones" },
          { label: "New" },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/dashboard/delivery-zones" })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Zone Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Zone Name</Label>
                <Input id="name" placeholder="e.g., Metro Manila" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief description of coverage area"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincodes">Coverage (Pincodes/Regions)</Label>
                <textarea
                  id="pincodes"
                  className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2"
                  placeholder="Enter pincodes or region names, one per line"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fee">Shipping Fee ($)</Label>
                <Input id="fee" type="number" placeholder="5.00" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minForFree">
                  Min Order for Free Shipping ($)
                </Label>
                <Input id="minForFree" type="number" placeholder="50.00" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Enabled</Label>
                <Switch id="enabled" defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full">Create Zone</Button>
        </div>
      </div>
    </div>
  );
}
