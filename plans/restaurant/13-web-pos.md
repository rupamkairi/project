# Phase 13 — Web: POSApp

---

## 13.1 Orders Page (Main POS View)

Route: `/pos/orders`

```tsx
export function PosOrdersPage() {
  const { outletId } = useOutletStore();
  // SSE for live orders
  const { orders } = useLiveOrders(outletId);

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Active tables / orders */}
      <div className="col-span-2 overflow-y-auto">
        <div className="grid grid-cols-4 gap-3">
          {tables.map(t => (
            <TableCard key={t.id} table={t} onClick={() => navigate(`/pos/tables/${t.id}`)} />
          ))}
        </div>
      </div>

      {/* Open orders sidebar */}
      <aside className="border-l overflow-y-auto">
        <h3 className="text-sm font-medium p-3">Open Orders</h3>
        {orders.filter(o => !["completed", "rejected"].includes(o.status)).map(o => (
          <OrderRow key={o.id} order={o} onClick={() => navigate(`/pos/orders/${o.id}`)} />
        ))}
      </aside>
    </div>
  );
}
```

---

## 13.2 New Order Page

Route: `/pos/orders/new`

```tsx
export function NewOrderPage() {
  const { outletId } = useOutletStore();
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [cart, setCart] = useState<CartItem[]>([]);
  const { data: menu } = useMenu(outletId);
  const create = useMutation({ mutationFn: () => placeOrder(outletId, orderType, cart) });

  return (
    <div className="flex h-full">
      {/* Menu */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex gap-2 p-3 border-b">
          {["dine-in", "takeaway", "delivery"].map(t => (
            <Button key={t} size="sm" variant={orderType === t ? "default" : "outline"}
              onClick={() => setOrderType(t as any)}>{t}</Button>
          ))}
        </div>
        <CategoryTabs categories={menu?.categories}>
          {(category) => (
            <div className="grid grid-cols-3 gap-3 p-3">
              {menu?.items.filter(i => i.categoryId === category.id).map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  unavailable={!item.isAvailable}
                  onAdd={(modifiers) => addToCart(item, modifiers)}
                />
              ))}
            </div>
          )}
        </CategoryTabs>
      </main>

      {/* Cart */}
      <CartPanel
        items={cart}
        onQtyChange={updateQty}
        onRemove={removeFromCart}
        onPlace={() => create.mutateAsync()}
        loading={create.isPending}
      />
    </div>
  );
}
```

---

## 13.3 Order Detail Page

Route: `/pos/orders/:id`

Tabs: Items | KOTs | Bill

```tsx
export function OrderDetailPage() {
  const { id } = useParams();
  const { data: order } = useOrder(id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold">{order?.orderNumber}</h1>
          <StatusBadge status={order?.status} />
        </div>
        <div className="flex gap-2">
          {order?.status === "ready" && <Button onClick={() => serveOrder(id)}>Mark Served</Button>}
          {!order?.billId && order?.status !== "draft" && (
            <Button variant="outline" onClick={() => createBill(id)}>Create Bill</Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items ({order?.items.length})</TabsTrigger>
          <TabsTrigger value="kots">KOTs</TabsTrigger>
          <TabsTrigger value="bill">Bill</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <OrderItemsTable items={order?.items} />
          {["draft", "placed", "accepted", "preparing"].includes(order?.status) && (
            <Button size="sm" onClick={() => navigate(`/pos/orders/${id}/add-items`)}>
              Add Items
            </Button>
          )}
        </TabsContent>

        <TabsContent value="kots">
          {order?.kots.map(k => <KotStatusCard key={k.id} kot={k} />)}
        </TabsContent>

        <TabsContent value="bill">
          {order?.bill ? <BillDetail bill={order.bill} orderId={id} /> : <p className="text-muted-foreground text-sm">No bill yet</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 13.4 Bill Settlement Dialog

```tsx
export function BillSettleDialog({ bill, onSettled }) {
  const [payments, setPayments] = useState([{ method: "cash", amount: bill.total }]);
  const settle = useMutation({ mutationFn: () => rstApi.post(`/bills/${bill.id}/settle`, { payments }) });

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const cashPayment = payments.find(p => p.method === "cash");
  const changeDue = cashPayment ? cashPayment.amount - (bill.total - (totalPaid - cashPayment.amount)) : 0;

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader><DialogTitle>Settle Bill #{bill.billNumber}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span><AmountDisplay amount={bill.total} />
          </div>

          <PaymentMethodEditor payments={payments} total={bill.total} onChange={setPayments} />

          {changeDue > 0 && (
            <div className="bg-green-50 rounded p-3 flex justify-between text-green-700">
              <span>Change Due</span><AmountDisplay amount={changeDue} />
            </div>
          )}

          <div className={cn("flex justify-between text-sm",
            Math.abs(totalPaid - bill.total) > 0.01 ? "text-red-500" : "text-green-600"
          )}>
            <span>Remaining</span>
            <AmountDisplay amount={bill.total - totalPaid} />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => settle.mutateAsync().then(onSettled)}
            disabled={Math.abs(totalPaid - bill.total) > 0.01 || settle.isPending}
          >
            Confirm Settlement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 13.5 Tables Page

Route: `/pos/tables`

Grid of tables colored by status. Click occupied table → go to its current order.

```tsx
function TableCard({ table }) {
  const statusColor = {
    available: "bg-green-50 border-green-200",
    occupied: "bg-zinc-100 border-zinc-300",
    reserved: "bg-amber-50 border-amber-200",
    dirty: "bg-red-50 border-red-200",
    blocked: "bg-slate-100 border-slate-200",
  }[table.status];

  return (
    <div className={cn("rounded-lg border p-3 cursor-pointer hover:shadow-sm", statusColor)}>
      <p className="font-bold text-lg">{table.tableNumber}</p>
      <p className="text-xs text-muted-foreground">{table.section} · {table.capacity} pax</p>
      <StatusBadge status={table.status} size="xs" />
    </div>
  );
}
```
