import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { CreditCard, Check } from "lucide-react";
import { useState } from "react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/settings/payments",
  component: PaymentSettings,
});

function PaymentSettings() {
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Settings"
        breadcrumbs={[
          { label: "Settings", href: "/dashboard/settings" },
          { label: "Payments" },
        ]}
      />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Stripe
              </CardTitle>
              <Switch
                checked={stripeEnabled}
                onCheckedChange={setStripeEnabled}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value="sk_test_••••••••••••••••"
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Publishable Key</Label>
              <Input
                type="password"
                value="pk_test_••••••••••••••••"
                disabled
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Check className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Razorpay
              </CardTitle>
              <Switch
                checked={razorpayEnabled}
                onCheckedChange={setRazorpayEnabled}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Key ID</Label>
              <Input placeholder="rzp_test_••••••••••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Key Secret</Label>
              <Input type="password" placeholder="••••••••••••••••" />
            </div>
            <Button variant="outline" size="sm">
              <Check className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
          </CardContent>
        </Card>

        <Button>Save Payment Settings</Button>
      </div>
    </div>
  );
}
