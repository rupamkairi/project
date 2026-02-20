import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { mockDeliveryZones } from "@/lib/mock-data";
import { ArrowLeft, Trash2, MapPin } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/delivery-zones/$zoneId",
  component: EditDeliveryZone,
});

function EditDeliveryZone() {
  const { zoneId } = Route.useParams();
  const navigate = useNavigate();
  const zone = mockDeliveryZones.find((z) => z.id === zoneId);

  if (!zone) {
    return <div>Zone not found</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={zone.name}
        description={
          <StatusBadge status={zone.enabled ? "active" : "inactive"} />
        }
        breadcrumbs={[
          { label: "Delivery Zones", href: "/dashboard/delivery-zones" },
          { label: zone.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/dashboard/delivery-zones" })}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button>Save Changes</Button>
          </div>
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
                <Input id="name" defaultValue={zone.name} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" defaultValue={zone.description} />
              </div>

              <div className="space-y-2">
                <Label>Coverage Areas</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {zone.coverage.map((area, i) => (
                    <Badge key={i} variant="secondary">
                      <MapPin className="h-3 w-3 mr-1" />
                      {area}
                    </Badge>
                  ))}
                </div>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping Fee</span>
                <span className="font-medium">${zone.fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Free Shipping Min</span>
                <span className="font-medium">
                  {zone.minOrderForFree
                    ? `$${zone.minOrderForFree.toFixed(2)}`
                    : "N/A"}
                </span>
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
                <Switch id="enabled" defaultChecked={zone.enabled} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
