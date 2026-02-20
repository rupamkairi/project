import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader, DateDisplay } from "@/components/shared";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/price-lists/",
  component: PriceLists,
});

const mockPriceLists = [
  {
    id: "PL1",
    name: "Retail Prices",
    currency: "USD",
    rules: 45,
    validFrom: new Date("2024-01-01"),
    validTo: new Date("2024-12-31"),
    status: "active",
  },
  {
    id: "PL2",
    name: "Wholesale Prices",
    currency: "USD",
    rules: 120,
    validFrom: new Date("2024-01-01"),
    validTo: new Date("2024-12-31"),
    status: "active",
  },
  {
    id: "PL3",
    name: "Flash Sale - January",
    currency: "USD",
    rules: 15,
    validFrom: new Date("2024-01-15"),
    validTo: new Date("2024-01-20"),
    status: "expired",
  },
  {
    id: "PL4",
    name: "VIP Prices",
    currency: "USD",
    rules: 30,
    validFrom: new Date("2024-02-01"),
    validTo: null,
    status: "draft",
  },
];

function PriceLists() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Price Lists"
        description="Manage pricing rules and price overrides"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Price List
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Tag className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{mockPriceLists.length}</p>
                <p className="text-sm text-muted-foreground">Price Lists</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold">
              {mockPriceLists.filter((p) => p.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Rules</p>
            <p className="text-2xl font-bold">
              {mockPriceLists.reduce((sum, p) => sum + p.rules, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-left font-medium">Name</th>
              <th className="p-4 text-left font-medium">Currency</th>
              <th className="p-4 text-left font-medium">Rules</th>
              <th className="p-4 text-left font-medium">Valid Period</th>
              <th className="p-4 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockPriceLists.map((list) => (
              <tr
                key={list.id}
                className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
              >
                <td className="p-4 font-medium">{list.name}</td>
                <td className="p-4">
                  <Badge variant="outline">{list.currency}</Badge>
                </td>
                <td className="p-4">{list.rules} rules</td>
                <td className="p-4">
                  {list.validTo ? (
                    <span className="text-muted-foreground">
                      <DateDisplay date={list.validFrom} format="short" /> -{" "}
                      <DateDisplay date={list.validTo} format="short" />
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No end date</span>
                  )}
                </td>
                <td className="p-4">
                  <Badge
                    variant={list.status === "active" ? "default" : "secondary"}
                  >
                    {list.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
