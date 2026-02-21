import { createRoute } from "@tanstack/react-router";
import { Route as lmsLayoutRoute } from "../layout";
import { PageHeader } from "../../components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { mockPaymentSettings } from "../../lib/mock-data";
import { useState } from "react";
import { Save, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PaymentSettings as PaymentSettingsType } from "../../types";

export const Route = createRoute({
  getParentRoute: () => lmsLayoutRoute,
  path: "/settings/payments",
  component: PaymentSettings,
});

function PaymentSettings() {
  const [settings, setSettings] = useState<
    PaymentSettingsType & Record<string, unknown>
  >({
    ...mockPaymentSettings,
    razorpayKeyId: mockPaymentSettings.razorpayKeyId || "",
    razorpayWebhookSecret: mockPaymentSettings.razorpayWebhookSecret || "",
  });
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const handleSave = () => {
    console.log("Saving payment settings:", settings);
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setTestLoading(false);
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Settings"
        description="Configure payment gateways"
      >
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateway</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gateway">Active Gateway</Label>
                <Select
                  value={settings.activeGateway}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      activeGateway: value as "stripe" | "razorpay",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="razorpay">Razorpay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {settings.activeGateway === "stripe" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="stripeApiKey">API Key</Label>
                    <Input
                      id="stripeApiKey"
                      type="password"
                      value={settings.stripeApiKey || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          stripeApiKey: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stripeWebhookSecret">Webhook Secret</Label>
                    <Input
                      id="stripeWebhookSecret"
                      type="password"
                      value={settings.stripeWebhookSecret || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          stripeWebhookSecret: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="razorpayKeyId">Key ID</Label>
                    <Input
                      id="razorpayKeyId"
                      type="password"
                      value={settings.razorpayKeyId || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          razorpayKeyId: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="razorpayWebhookSecret">
                      Webhook Secret
                    </Label>
                    <Input
                      id="razorpayWebhookSecret"
                      type="password"
                      value={settings.razorpayWebhookSecret || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          razorpayWebhookSecret: e.target.value,
                        })
                      }
                    />
                  </div>
                </>
              )}

              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testLoading}
              >
                {testLoading ? (
                  "Testing..."
                ) : testSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    Connection Successful
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supported Currencies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {settings.supportedCurrencies.map((currency: string) => (
                  <Badge key={currency} variant="secondary">
                    {currency}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Contact support to add or remove supported currencies
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gateway Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Gateway
                </p>
                <p className="mt-1 font-semibold capitalize">
                  {settings.activeGateway}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <Badge variant="default" className="mt-1">
                  Configured
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
