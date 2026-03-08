import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader, StatusBadge, DateDisplay } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { mockPriceLists } from "@/lib/mock-data";
import { ArrowLeft, Trash2, Plus } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/price-lists/$priceListId",
  component: PriceListDetail,
});

function PriceListDetail() {
  const { priceListId } = Route.useParams();
  const navigate = useNavigate();
  const priceList = mockPriceLists.find((p) => p.id === priceListId);

  if (!priceList) {
    return <div>Price list not found</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={priceList.name}
        description={<StatusBadge status={priceList.status} />}
        breadcrumbs={[
          { label: "Price Lists", href: "/dashboard/price-lists" },
          { label: priceList.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/dashboard/price-lists" })}
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Price Rules</CardTitle>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priceList.rules.map((rule, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{rule.variantSku}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">
                        ${(rule.price / 100).toFixed(2)}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {priceList.rules.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No price rules configured
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" defaultValue={priceList.name} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  defaultValue={priceList.currency}
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validFrom">Valid From</Label>
                <Input
                  id="validFrom"
                  type="date"
                  defaultValue={priceList.validFrom.toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validTo">Valid To</Label>
                <Input
                  id="validTo"
                  type="date"
                  defaultValue={priceList.validTo.toISOString().split("T")[0]}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Rules</span>
                <span className="font-medium">{priceList.rules.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Created</span>
                <DateDisplay date={priceList.createdAt} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
