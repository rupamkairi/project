# Phase 17 — Web: CustomerApp

---

## 17.1 Customer App Overview

Used for:
1. **Dine-in self-order** — guest scans QR code on table, opens `/order?table=TABLE_QR_CODE`
2. **Delivery/takeaway** — customer places order from website or app

Mobile-first, single-page flow: Menu → Cart → Order → Track.

---

## 17.2 Menu Page

Route: `/order?tableCode=XXX` or `/order?outletId=XXX&type=delivery`

```tsx
export function CustomerMenuPage() {
  const [searchParams] = useSearchParams();
  const tableCode = searchParams.get("table");
  const outletId = searchParams.get("outletId");

  // Resolve outlet from table code
  const { data: context } = useQuery({
    queryKey: ["order-context", tableCode, outletId],
    queryFn: () => tableCode
      ? rstApi.get(`/outlets/by-table-qr?code=${tableCode}`)
      : rstApi.get(`/outlets/${outletId}`),
  });

  const { data: menu } = useMenu(context?.outletId);
  const { cart, addItem, removeItem, totalItems } = useCartStore();

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
        <div>
          <p className="font-semibold">{context?.outlet?.name}</p>
          {context?.table && <p className="text-sm text-muted-foreground">Table {context.table.tableNumber}</p>}
        </div>
        <Button variant="outline" className="relative" onClick={() => navigate("/order/cart")}>
          Cart
          {totalItems > 0 && <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">{totalItems}</Badge>}
        </Button>
      </div>

      {/* Category navigation */}
      <div className="flex gap-2 overflow-x-auto p-3 no-scrollbar">
        {menu?.categories.map(c => (
          <button key={c.id} className="text-sm px-3 py-1 rounded-full border whitespace-nowrap"
            onClick={() => scrollToCategory(c.id)}>{c.name}</button>
        ))}
      </div>

      {/* Items */}
      {menu?.categories.map(cat => (
        <section key={cat.id} id={`cat-${cat.id}`} className="p-3">
          <h3 className="font-semibold mb-3">{cat.name}</h3>
          <div className="space-y-3">
            {menu.items.filter(i => i.categoryId === cat.id && i.isAvailable).map(item => (
              <CustomerMenuItemCard key={item.id} item={item} onAdd={(m) => addItem(item, m)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

---

## 17.3 Cart Page

Route: `/order/cart`

```tsx
export function CartPage() {
  const { cart, updateQty, removeItem, total } = useCartStore();
  const { outletId, tableId, orderType } = useOrderContext();
  const placeOrder = useMutation({ mutationFn: () => placeCustomerOrder(outletId, tableId, orderType, cart) });

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Your Order</h1>

      {cart.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Your cart is empty</p>
      ) : (
        <>
          <div className="space-y-3">
            {cart.map(item => (
              <CartItem key={item.id} item={item} onQtyChange={q => updateQty(item.id, q)} onRemove={() => removeItem(item.id)} />
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span><AmountDisplay amount={total.subtotal} />
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax</span><AmountDisplay amount={total.tax} />
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span><AmountDisplay amount={total.total} />
            </div>
          </div>

          <Textarea placeholder="Special instructions (optional)" className="text-sm" />

          <Button className="w-full" size="lg" onClick={() => placeOrder.mutateAsync()} disabled={placeOrder.isPending}>
            Place Order
          </Button>
        </>
      )}
    </div>
  );
}
```

---

## 17.4 Order Status Page

Route: `/order/status/:orderId`

Real-time order tracking via SSE.

```tsx
export function OrderStatusPage() {
  const { orderId } = useParams();
  const { data: order } = useQuery({ queryKey: ["order-status", orderId], queryFn: () => rstApi.get(`/orders/${orderId}`) });

  // SSE for live updates
  useOrderSSE(orderId, (update) => queryClient.setQueryData(["order-status", orderId], update));

  const statusSteps = ORDER_STATUS_STEPS[order?.type ?? "dine-in"];
  const currentStep = statusSteps.indexOf(order?.status ?? "");

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="text-center">
        <p className="text-2xl font-mono font-bold">{order?.orderNumber}</p>
        <StatusBadge status={order?.status} />
      </div>

      {/* Progress stepper */}
      <div className="space-y-3">
        {statusSteps.map((step, i) => (
          <div key={step} className={cn("flex items-center gap-3", i > currentStep && "opacity-40")}>
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs",
              i < currentStep ? "bg-green-600 text-white" :
              i === currentStep ? "bg-primary text-white" : "bg-muted")}>
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span className="text-sm capitalize">{step.replace(/-/g, " ")}</span>
          </div>
        ))}
      </div>

      {/* Delivery tracking */}
      {order?.type === "delivery" && order?.delivery?.riderLocation && (
        <div className="bg-muted rounded p-3 text-sm">
          Rider is on the way · Last update {timeAgo(order.delivery.riderLocation.updatedAt)}
        </div>
      )}
    </div>
  );
}
```

---

## 17.5 Order SSE Hook

```typescript
export function useOrderSSE(orderId: string, onUpdate: (order: Order) => void) {
  useEffect(() => {
    const eventSource = new EventSource(`/restaurant/orders/${orderId}/status-stream`);
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      onUpdate(data);
    };
    return () => eventSource.close();
  }, [orderId]);
}
```
