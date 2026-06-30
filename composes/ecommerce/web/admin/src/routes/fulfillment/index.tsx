import { createRoute } from "@tanstack/react-router";
import { ecommerceAdminLayoutRoute } from "../admin.layout";
import { PageHeader, Button, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@projectx/ui";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ecommerceAdminApi } from "../../lib/api";

const STATUS_BADGES: Record<string, string> = { pending: "bg-yellow-100 text-yellow-700", shipped: "bg-blue-100 text-blue-700", delivered: "bg-green-100 text-green-700" };

function AdminFulfillment() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-fulfillments", statusFilter], queryFn: () => ecommerceAdminApi.getFulfillments({ status: statusFilter }) });
  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ecommerceAdminApi.updateFulfillmentStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-fulfillments"] }),
  });

  const fulfillments = data?.data?.data ?? data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Fulfillment Queue" />
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="shipped">Shipped</SelectItem>
          <SelectItem value="delivered">Delivered</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : fulfillments.length === 0 ? <p className="text-sm text-muted-foreground">No fulfillments found</p> : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3 font-medium">Order</th><th className="p-3 font-medium">Carrier</th><th className="p-3 font-medium">Tracking</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Actions</th></tr></thead>
            <tbody>
              {fulfillments.map((f: any) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-3 font-medium cursor-pointer" onClick={() => navigate({ to: "/admin/ecommerce/orders/$id", params: { id: f.orderId } })}>
                    {f.order?.referenceNo ?? f.orderId.slice(0, 8)}
                  </td>
                  <td className="p-3">{f.carrier ?? "—"}</td>
                  <td className="p-3">{f.trackingNumber ?? "—"}</td>
                  <td className="p-3"><Badge className={STATUS_BADGES[f.status] ?? ""}>{f.status}</Badge></td>
                  <td className="p-3">
                    {f.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateMut.mutate({ id: f.id, status: "shipped" })}>Mark Shipped</Button>
                        <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ id: f.id, status: "delivered" })}>Mark Delivered</Button>
                      </div>
                    )}
                    {f.status === "shipped" && (
                      <Button size="sm" onClick={() => updateMut.mutate({ id: f.id, status: "delivered" })}>Mark Delivered</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const ecoAdminFulfillmentRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/fulfillment",
  component: AdminFulfillment,
});
