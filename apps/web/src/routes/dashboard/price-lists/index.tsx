import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader, DateDisplay, StatusBadge } from "@/components/shared";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag } from "lucide-react";
import { mockPriceLists } from "@/lib/mock-data";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/price-lists/",
  component: PriceLists,
});

function PriceLists() {
  const navigate = useNavigate();
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
                onClick={() =>
                  navigate({
                    to: "/dashboard/price-lists/$priceListId",
                    params: { priceListId: list.id },
                  })
                }
              >
                <td className="p-4 font-medium">{list.name}</td>
                <td className="p-4">
                  <Badge variant="outline">{list.currency}</Badge>
                </td>
                <td className="p-4">{list.rules.length} rules</td>
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
                  <StatusBadge status={list.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
