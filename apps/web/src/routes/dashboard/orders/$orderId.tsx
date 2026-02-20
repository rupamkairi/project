import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import {
  PageHeader,
  StatusBadge,
  MoneyDisplay,
  DateDisplay,
  ConfirmDialog,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { mockOrders } from "@/lib/mock-data";
import { useState } from "react";
import { Package, CreditCard, MapPin, Clock, X, RotateCcw } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/orders/$orderId",
  component: OrderDetail,
});

function OrderDetail() {
  const { orderId } = Route.useParams();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);

  const order = mockOrders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = Math.round(subtotal * 0.1);
  const shipping = 500;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${order.id}`}
        description={<StatusBadge status={order.status} />}
        breadcrumbs={[
          { label: "Orders", href: "/dashboard/orders" },
          { label: order.id },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(true)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button variant="outline" onClick={() => setRefundDialogOpen(true)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Refund
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.variant}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        <MoneyDisplay amount={item.price * item.quantity} />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    <MoneyDisplay amount={subtotal} />
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>
                    <MoneyDisplay amount={tax} />
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    <MoneyDisplay amount={shipping} />
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>
                    <MoneyDisplay amount={subtotal + tax + shipping} />
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TimelineItem
                  title="Order Placed"
                  date={order.createdAt}
                  description={`Order placed by ${order.customerName}`}
                  completed
                />
                <TimelineItem
                  title="Payment Confirmed"
                  date={new Date(order.createdAt.getTime() + 300000)}
                  description="Payment received via credit card"
                  completed={order.paymentStatus === "paid"}
                />
                <TimelineItem
                  title="Order Shipped"
                  date={
                    order.status === "shipped" || order.status === "delivered"
                      ? new Date(order.createdAt.getTime() + 86400000)
                      : undefined
                  }
                  description="Shipped via Express Delivery"
                  completed={
                    order.status === "shipped" || order.status === "delivered"
                  }
                />
                <TimelineItem
                  title="Delivered"
                  date={
                    order.status === "delivered"
                      ? new Date(order.createdAt.getTime() + 172800000)
                      : undefined
                  }
                  description="Package delivered to customer"
                  completed={order.status === "delivered"}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{order.customerName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {order.shippingAddress.line1}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postcode}
                <br />
                {order.shippingAddress.country}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={order.paymentStatus} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span>Credit Card</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-sm">
                    TXN-{order.id.slice(4)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fulfillment</span>
                  <StatusBadge status={order.fulfillmentStatus} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Order"
        description="Are you sure you want to cancel this order? This action cannot be undone."
        confirmLabel="Cancel Order"
        variant="destructive"
        onConfirm={() => setCancelDialogOpen(false)}
      />

      <ConfirmDialog
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        title="Refund Order"
        description="This will initiate a refund for this order. The refund amount will be returned to the original payment method."
        confirmLabel="Process Refund"
        variant="destructive"
        onConfirm={() => setRefundDialogOpen(false)}
      />
    </div>
  );
}

function TimelineItem({
  title,
  date,
  description,
  completed,
}: {
  title: string;
  date?: Date;
  description: string;
  completed: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full ${
            completed ? "bg-green-500" : "bg-gray-300"
          }`}
        />
        <div className="w-0.5 h-full bg-gray-200 mt-2" />
      </div>
      <div className="pb-4">
        <p className="font-medium">{title}</p>
        {date && (
          <p className="text-sm text-muted-foreground">
            <DateDisplay date={date} format="datetime" />
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}
