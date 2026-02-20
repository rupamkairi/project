import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader } from "@/components/shared";
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
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/coupons/new",
  component: CreateCoupon,
});

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function CreateCoupon() {
  const navigate = useNavigate();
  const [code, setCode] = useState(generateCode());
  const [type, setType] = useState<"percentage" | "fixed">("percentage");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Coupon"
        description="Create a new discount coupon"
        breadcrumbs={[
          { label: "Coupons", href: "/dashboard/coupons" },
          { label: "New" },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/dashboard/coupons" })}
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
              <CardTitle>Coupon Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Coupon Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCode(generateCode())}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
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
                  <Input
                    id="value"
                    type="number"
                    placeholder={type === "percentage" ? "10" : "500"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minOrder">Minimum Order Amount</Label>
                <Input id="minOrder" type="number" placeholder="0" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Total Usage Limit</Label>
                <Input id="usageLimit" type="number" placeholder="100" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="perCustomer">Per Customer Limit</Label>
                <Input id="perCustomer" type="number" placeholder="1" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Valid From</Label>
                <Input id="validFrom" type="date" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validTo">Valid Until</Label>
                <Input id="validTo" type="date" />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full">Create Coupon</Button>
        </div>
      </div>
    </div>
  );
}
