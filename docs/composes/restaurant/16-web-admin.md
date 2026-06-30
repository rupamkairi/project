# Phase 16 — Web: AdminApp

---

## 16.1 Admin Dashboard

Route: `/restaurant-admin/dashboard`

```tsx
export function RestaurantAdminDashboard() {
  const { outletId } = useOutletStore();
  const { data } = useQuery({
    queryKey: ["rst-analytics-overview", outletId],
    queryFn: () => rstApi.get(`/analytics/overview?outletId=${outletId}&dateFrom=${startOfMonth()}&dateTo=${today()}`),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Revenue (MTD)" value={<AmountDisplay amount={data?.revenue.mtdTotal} />} />
        <StatCard label="Orders Today" value={data?.orders.total} />
        <StatCard label="Avg Order Value" value={<AmountDisplay amount={data?.orders.avgOrderValue} />} />
        <StatCard label="Delivery Rate" value={`${Math.round((data?.channelMix.find(c => c.channel === "delivery")?.pct ?? 0))}%`} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <RevenueByDayChart data={data?.revenueByDay} />
        <TopItemsTable items={data?.topItems} />
      </div>

      {/* Low stock alerts */}
      <LowStockAlerts outletId={outletId} />
    </div>
  );
}
```

---

## 16.2 Menu Management Page

Route: `/restaurant-admin/menu`

```tsx
export function MenuManagementPage() {
  const { outletId } = useOutletStore();
  const { data: menu } = useMenu(outletId);
  const toggle86 = useMutation({
    mutationFn: ({ itemId, available }: { itemId: string; available: boolean }) =>
      rstApi.post(`/admin/menu/${itemId}/toggle`, { available }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">Menu</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openModifiersPage()}>Modifiers</Button>
          <Button onClick={() => openCreateItemDialog()}>Add Item</Button>
        </div>
      </div>

      {menu?.categories.map(cat => (
        <div key={cat.id}>
          <h3 className="text-sm font-semibold mb-2">{cat.name}</h3>
          <div className="space-y-2">
            {menu.items.filter(i => i.categoryId === cat.id).map(item => (
              <div key={item.id} className="border rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className={cn("font-medium", !item.isAvailable && "text-muted-foreground line-through")}>{item.name}</p>
                  <p className="text-sm text-muted-foreground"><AmountDisplay amount={item.basePrice} /></p>
                  {item.station && <Badge variant="outline" className="text-xs">{item.station}</Badge>}
                </div>
                <Switch
                  checked={item.isAvailable}
                  onCheckedChange={v => toggle86.mutate({ itemId: item.id, available: v })}
                />
                <Button size="sm" variant="ghost" onClick={() => editItem(item)}>Edit</Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 16.3 Aggregator Mapping Page

Route: `/restaurant-admin/aggregators`

Map internal menu items to aggregator external IDs:

```tsx
export function AggregatorMappingPage() {
  const { data: menu } = useMenu(outletId);
  const { data: aggOrders } = useQuery({ queryKey: ["unresolved-agg-orders"], queryFn: () => rstApi.get("/aggregator-orders?status=rejected&reason=UNMAPPED_ITEMS") });

  return (
    <div className="space-y-6">
      {/* Unmapped items alert */}
      {aggOrders?.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>{aggOrders.length} rejected orders due to unmapped items</AlertDescription>
        </Alert>
      )}

      {/* Aggregator ID editor per item */}
      <DataTable
        columns={[
          { accessorKey: "name", header: "Menu Item" },
          { id: "swiggy", header: "Swiggy ID",
            cell: ({ row }) => (
              <Input
                defaultValue={row.original.aggregatorIds?.swiggy ?? ""}
                placeholder="Swiggy item ID"
                onBlur={e => updateAggId(row.original.id, "swiggy", e.target.value)}
                className="h-7 w-32 text-xs"
              />
            )
          },
          { id: "zomato", header: "Zomato ID",
            cell: ({ row }) => (
              <Input
                defaultValue={row.original.aggregatorIds?.zomato ?? ""}
                placeholder="Zomato ID"
                onBlur={e => updateAggId(row.original.id, "zomato", e.target.value)}
                className="h-7 w-32 text-xs"
              />
            )
          },
        ]}
        data={menu?.items ?? []}
      />
    </div>
  );
}
```

---

## 16.4 Inventory Page

Route: `/restaurant-admin/inventory`

```tsx
export function InventoryPage() {
  const { data: alerts } = useQuery({ queryKey: ["stock-alerts"], queryFn: () => rstApi.get(`/admin/ingredients/alerts?outletId=${outletId}`) });
  const { data: ingredients } = useQuery({ queryKey: ["ingredients"], queryFn: () => rstApi.get(`/admin/ingredients?outletId=${outletId}`) });

  return (
    <div className="space-y-6">
      {alerts?.alerts.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader><CardTitle className="text-amber-600">Low Stock Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.alerts.map(a => (
                <div key={a.ingredientId} className="flex justify-between text-sm">
                  <span>{a.name}</span>
                  <span className="text-amber-600">{a.currentStock} {a.unit} remaining (reorder at {a.reorderLevel})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <h2 className="text-lg font-semibold">All Ingredients</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openPurchaseDialog()}>Record Purchase</Button>
          <Button onClick={() => openAddIngredientDialog()}>Add Ingredient</Button>
        </div>
      </div>

      <DataTable columns={ingredientColumns} data={ingredients?.ingredients ?? []} />
    </div>
  );
}
```

---

## 16.5 Analytics Page

Route: `/restaurant-admin/analytics`

Tabs: Sales | Kitchen | Delivery | Menu | Inventory

Each tab embeds the corresponding chart components from phase 09 data.
