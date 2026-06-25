import { createRoute } from "@tanstack/react-router";
import { ecommerceAdminLayoutRoute } from "../admin.layout";
import { PageHeader, Input, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@projectx/ui";
import { useState } from "react";
import { toast } from "sonner";

export const ecoAdminSettingsRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/settings",
  component: AdminSettings,
});

function AdminSettings() {
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [ordersPrefix, setOrdersPrefix] = useState("ECO-");

  return (
    <div className="space-y-4 max-w-xl">
      <PageHeader title="Settings" />
      <div className="rounded-lg border p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Default Currency</label>
          <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="INR">INR (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Order Reference Prefix</label>
          <Input value={ordersPrefix} onChange={(e) => setOrdersPrefix(e.target.value)} />
        </div>
        <Button onClick={() => toast.success("Settings saved (mock)")}>Save Settings</Button>
      </div>
    </div>
  );
}
