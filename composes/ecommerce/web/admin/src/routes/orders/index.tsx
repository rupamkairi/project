import { createRoute } from "@tanstack/react-router";
import { ecommerceAdminLayoutRoute } from "../admin.layout";
import { useState } from "react";
import { PageHeader, Button, Input, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@projectx/ui";
import { Search, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "@tanstack/react-router";
import { ecommerceAdminApi } from "../../lib/api";
import { formatCurrency } from "../../lib/format";

const STATUS_BADGES: Record<string, string> = { pending: "bg-yellow-100 text-yellow-700", processing: "bg-blue-100 text-blue-700", fulfilled: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-600", refunded: "bg-zinc-100 text-zinc-600" };

function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["admin-orders", statusFilter, q], queryFn: () => ecommerceAdminApi.getOrders({ status: statusFilter !== "all" ? statusFilter : undefined, q: q || undefined }) });

  const orders = data?.data?.data ?? data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Orders" />
      <div className="flex items-center gap-3">
        <Input placeholder="Search order ID or customer email..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="processing">Processing</SelectItem><SelectItem value="fulfilled">Fulfilled</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
        </Select>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders found</p> : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3 font-medium">Order</th><th className="p-3 font-medium">Customer</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Total</th><th className="p-3 font-medium">Date</th><th className="p-3 font-medium"></th></tr></thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer" onClick={() => navigate({ to: "/admin/ecommerce/orders/$id", params: { id: o.id } })}>
                  <td className="p-3 font-medium">{o.referenceNo ?? o.id.slice(0, 8)}</td>
                  <td className="p-3">{o.person?.email ?? "—"}</td>
                  <td className="p-3"><Badge className={STATUS_BADGES[o.status]}>{o.status}</Badge></td>
                  <td className="p-3">{formatCurrency(o.totalAmount)}</td>
                  <td className="p-3 text-muted-foreground">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}</td>
                  <td className="p-3"><Button variant="ghost" size="sm"><Eye className="h-3 w-3 mr-1" /> View</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const ecoAdminOrdersRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/orders",
  component: AdminOrders,
});
