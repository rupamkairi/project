import { createRoute } from "@tanstack/react-router";
import { ecommerceAdminLayoutRoute } from "../admin.layout";
import { PageHeader, Input, Button, Avatar } from "@projectx/ui";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ecommerceAdminApi } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { Mail, ShoppingBag } from "lucide-react";

function AdminCustomers() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["admin-customers", q], queryFn: () => ecommerceAdminApi.getCustomers({ q: q || undefined }) });
  const customers = data?.data?.data ?? data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Customers" />
      <Input placeholder="Search by name or email..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : customers.length === 0 ? <p className="text-sm text-muted-foreground">No customers found</p> : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3 font-medium">Customer</th><th className="p-3 font-medium">Email</th><th className="p-3 font-medium">Orders</th><th className="p-3 font-medium">Spent</th><th className="p-3 font-medium">Registered</th></tr></thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer" onClick={() => navigate({ to: "/ecommerce/admin/customers/$id", params: { id: c.id } })}>
                  <td className="p-3 flex items-center gap-2">
                    <Avatar name={c.person?.name ?? c.email} size="sm" />
                    <span className="font-medium">{c.person?.name ?? "—"}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{c.email}</td>
                  <td className="p-3">{c.orderCount ?? 0}</td>
                  <td className="p-3">{formatCurrency(c.totalSpent ?? 0)}</td>
                  <td className="p-3 text-muted-foreground">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminCustomerDetail() {
  const { id } = useParams({ from: ecoAdminCustomerDetailRoute });
  const { data: custData } = useQuery({ queryKey: ["admin-customer", id], queryFn: () => ecommerceAdminApi.getCustomer(id) });
  const cust = custData?.data;

  return (
    <div className="space-y-6">
      <PageHeader title={cust?.person?.name ?? "Customer"} breadcrumbs={[{ label: "Customers", href: "/ecommerce/admin/customers" }]} />
      {cust && (
        <>
          <div className="flex items-center gap-3">
            <Avatar name={cust.person?.name ?? cust.email} />
            <div>
              <h3 className="text-lg font-semibold">{cust.person?.name ?? "—"}</h3>
              <p className="text-sm text-muted-foreground">{cust.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 space-y-1 text-sm">
              <h4 className="font-medium text-muted-foreground mb-2">Summary</h4>
              <p>Orders: {cust.orderCount ?? 0}</p>
              <p>Total Spent: {formatCurrency(cust.totalSpent ?? 0)}</p>
              <p>Joined: {cust.createdAt ? new Date(cust.createdAt).toLocaleDateString() : "—"}</p>
            </div>
            <div className="rounded-lg border p-4 space-y-1 text-sm">
              <h4 className="font-medium text-muted-foreground mb-2">Contact</h4>
              <p><Mail className="h-3 w-3 inline mr-1" />{cust.email}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const ecoAdminCustomersRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/customers",
  component: AdminCustomers,
});

export const ecoAdminCustomerDetailRoute = createRoute({
  getParentRoute: () => ecommerceAdminLayoutRoute,
  path: "/customers/$id",
  component: AdminCustomerDetail,
});
