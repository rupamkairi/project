import { createRoute } from "@tanstack/react-router";
import { ecommerceAdminLayoutRoute } from "../admin.layout";
import { PageHeader, Button, Badge } from "@projectx/ui";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ecommerceAdminApi } from "../../lib/api";
import { formatCurrency } from "../../../../storefront/src/lib/format";

const STATUS_BADGES: Record<string, string> = { pending: "bg-yellow-100 text-yellow-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-600", refunded: "bg-zinc-100 text-zinc-600" };

function AdminReturns() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["admin-returns"], queryFn: () => ecommerceAdminApi.getReturns() });
  const returns = data?.data?.data ?? data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Returns" />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : returns.length === 0 ? <p className="text-sm text-muted-foreground">No returns yet</p> : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3 font-medium">Order</th><th className="p-3 font-medium">Reason</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Actions</th></tr></thead>
            <tbody>
              {returns.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer" onClick={() => navigate({ to: "/admin/ecommerce/returns/$id", params: { id: r.id } })}>
                  <td className="p-3 font-medium">{r.order?.referenceNo ?? r.orderId?.slice(0, 8) ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.reason ?? "—"}</td>
                  <td className="p-3"><Badge className={STATUS_BADGES[r.status]}>{r.status}</Badge></td>
                  <td className="p-3"><Button variant="ghost" size="sm">View</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminReturnDetail() {
  const { id } = useParams({ from: ecoAdminReturnDetailRoute });
  const { data: retData } = useQuery({ queryKey: ["admin-return", id], queryFn: () => ecommerceAdminApi.getReturn(id) });
  const ret = retData?.data;

  return (
    <div className="space-y-4">
      <PageHeader title={`Return ${id.slice(0, 8)}`} breadcrumbs={[{ label: "Returns", href: "/admin/ecommerce/returns" }]} />
      {ret && (
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <p>Status: <Badge>{ret.status}</Badge></p>
          <p>Reason: {ret.reason ?? "—"}</p>
          {ret.orderId && <p>Order: <span className="font-medium">{ret.order?.referenceNo ?? ret.orderId.slice(0, 8)}</span></p>}
          {ret.notes && <p>Notes: {ret.notes}</p>}
        </div>
      )}
    </div>
  );
}

export const ecoAdminReturnsRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/returns",
  component: AdminReturns,
});

export const ecoAdminReturnDetailRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/returns/$id",
  component: AdminReturnDetail,
});
