import { createRoute, useNavigate, Link } from "@tanstack/react-router";
import { ecommerceStorefrontLayoutRoute } from "./store.layout";
import { ecommerceStorefrontApi } from "../lib/api";
import { useCustomerStore } from "../stores/customer";
import { useQuery } from "@tanstack/react-query";
import { Button, Badge, Input, Card, CardContent, Separator } from "@projectx/ui";
import { formatCurrency } from "../lib/format";
import { User, Package, LogOut, Eye, Mail, Calendar, ShoppingBag, ArrowRight } from "lucide-react";
import { useParams } from "@tanstack/react-router";

const STATUS_BADGES: Record<string, string> = { pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", fulfilled: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" };

function StorefrontAccount() {
  const navigate = useNavigate();
  const customer = useCustomerStore((s) => s.customer);
  const logoutStore = useCustomerStore((s) => s.logout);

  const { data: profileData } = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => ecommerceStorefrontApi.getMe(),
    enabled: !!customer,
  });

  const { data: ordersData } = useQuery({
    queryKey: ["customer-orders"],
    queryFn: () => ecommerceStorefrontApi.getOrders({ limit: 10 }),
    enabled: !!customer,
  });

  const profile = profileData?.data;
  const orders = ordersData?.data?.data ?? ordersData?.data ?? [];

  if (!customer) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Sign in required</h2>
        <p className="text-sm text-muted-foreground">Sign in to view your account and orders</p>
        <Button asChild><Link to="/store/auth/login">Sign In</Link></Button>
        <p className="text-sm text-muted-foreground">Don't have an account? <Link to="/store/auth/register" className="text-primary hover:underline font-medium">Register</Link></p>
      </div>
    );
  }

  const handleLogout = () => {
    ecommerceStorefrontApi.setToken(null);
    logoutStore();
    navigate({ to: "/store" });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile?.person?.name ?? customer.email ?? "Account"}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {profile?.email ?? customer.email}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Orders", value: orders.length, icon: Package },
          { label: "Active", value: orders.filter((o: any) => o.status === "processing" || o.status === "pending").length, icon: ShoppingBag },
          { label: "Member Since", value: "", icon: Calendar },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-0 bg-muted/30">
              <CardContent className="p-4 text-center space-y-1">
                <Icon className="h-4 w-4 mx-auto text-muted-foreground" />
                <p className="text-xl font-bold">{stat.label === "Member Since" ? (profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString().slice(-4) : "—") : stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Order History</h2>
            <p className="text-sm text-muted-foreground">Your recent orders</p>
          </div>
          {orders.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/store/account" })}>
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-12 space-y-3 rounded-xl border border-dashed">
            <Package className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No orders yet</p>
            <Button size="sm" asChild><Link to="/store/products">Start Shopping</Link></Button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="p-3 font-medium">Order</th><th className="p-3 font-medium hidden sm:table-cell">Date</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium text-right">Total</th><th className="p-3 font-medium"></th></tr></thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{o.referenceNo ?? o.id.slice(0, 8)}</td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="p-3"><Badge className={STATUS_BADGES[o.status] ?? ""}>{o.status}</Badge></td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(o.totalAmount)}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/store/account/orders/$id", params: { id: o.id } })}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StorefrontAccountOrderDetail() {
  const { id } = useParams({ from: ecoStoreAccountOrderDetailRoute });
  const { data: orderData } = useQuery({
    queryKey: ["customer-order", id],
    queryFn: () => ecommerceStorefrontApi.getOrder(id),
  });
  const order = orderData?.data;

  if (!order) return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );

  const items = order.lines ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/store/account" className="hover:text-foreground transition-colors">Account</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{order.referenceNo ?? id.slice(0, 8)}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold">{order.referenceNo ?? `Order ${id.slice(0, 8)}`}</h1>
        <Badge className={`w-fit ${STATUS_BADGES[order.status] ?? ""}`}>{order.status}</Badge>
      </div>

      <Card>
        <CardContent className="p-6">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b"><tr><th className="pb-3 font-medium">Product</th><th className="pb-3 font-medium text-right">Qty</th><th className="pb-3 font-medium text-right">Price</th><th className="pb-3 font-medium text-right">Total</th></tr></thead>
            <tbody>
              {items.map((i: any) => (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="py-3">{i.description ?? i.itemId}</td>
                  <td className="py-3 text-right">{i.qty}</td>
                  <td className="py-3 text-right">{formatCurrency(i.unitPrice?.amount ?? i.unitPrice)}</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(i.lineTotal?.amount ?? i.unitPrice * i.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right mt-4 pt-4 border-t space-y-1">
            <p className="text-lg font-bold">Total: {formatCurrency(order.totalAmount)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const ecoStoreAccountRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/account",
  component: StorefrontAccount,
});

export const ecoStoreAccountOrderDetailRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/account/orders/$id",
  component: StorefrontAccountOrderDetail,
});
