import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import {
  PageHeader,
  StatusBadge,
  MoneyDisplay,
  DateDisplay,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockCustomers, mockOrders } from "@/lib/mock-data";
import { ArrowLeft, Mail, Phone, MapPin, ShoppingBag } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/customers/$customerId",
  component: CustomerDetail,
});

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const customer = mockCustomers.find((c) => c.id === customerId);

  if (!customer) {
    return <div>Customer not found</div>;
  }

  const customerOrders = mockOrders.filter(
    (o) => o.customerEmail === customer.email,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={<StatusBadge status={customer.status} />}
        breadcrumbs={[
          { label: "Customers", href: "/dashboard/customers" },
          { label: customer.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/dashboard/customers" })}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="destructive">Suspend Customer</Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Orders</span>
              <span className="font-medium">{customer.orders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lifetime Value</span>
              <span className="font-medium">
                <MoneyDisplay amount={customer.totalSpent} />
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Order Value</span>
              <span className="font-medium">
                <MoneyDisplay
                  amount={Math.round(customer.totalSpent / customer.orders)}
                />
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joined</span>
              <span className="font-medium">
                <DateDisplay date={customer.joinedAt} />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Addresses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 border rounded-lg">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Default Address</p>
                  <p className="text-sm text-muted-foreground">
                    123 Main Street, Apt 4B
                    <br />
                    New York, NY 10001
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customerOrders.length === 0 ? (
            <p className="text-muted-foreground">No orders found</p>
          ) : (
            <div className="space-y-4">
              {customerOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{order.id}</p>
                    <p className="text-sm text-muted-foreground">
                      <DateDisplay date={order.createdAt} />
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <p className="text-sm font-medium mt-1">
                      <MoneyDisplay amount={order.total} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
