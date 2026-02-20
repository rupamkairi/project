import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader, StatusBadge, DateDisplay } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockCoupons } from "@/lib/mock-data";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/coupons/$couponId",
  component: EditCoupon,
});

function EditCoupon() {
  const { couponId } = Route.useParams();
  const navigate = useNavigate();
  const coupon = mockCoupons.find((c) => c.id === couponId);

  const [type, setType] = useState<"percentage" | "fixed">(
    coupon?.type || "percentage",
  );

  if (!coupon) {
    return <div>Coupon not found</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${coupon.code}`}
        description={<StatusBadge status={coupon.status} />}
        breadcrumbs={[
          { label: "Coupons", href: "/dashboard/coupons" },
          { label: coupon.code },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/dashboard/coupons" })}
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
              <CardTitle>Coupon Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Coupon Code</Label>
                <Input
                  id="code"
                  value={coupon.code}
                  className="font-mono"
                  readOnly
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Discount Type</Label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as "percentage" | "fixed")}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">
                    {type === "percentage" ? "Percentage" : "Amount"}
                  </Label>
                  <Input id="value" type="number" defaultValue={coupon.value} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minOrder">Minimum Order Amount</Label>
                <Input
                  id="minOrder"
                  type="number"
                  defaultValue={coupon.minOrder}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Times Used</span>
                <span className="font-medium">{coupon.usageCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usage Limit</span>
                <span className="font-medium">{coupon.usageLimit}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid From</span>
                <DateDisplay date={coupon.validFrom} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid Until</span>
                <DateDisplay date={coupon.validTo} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
