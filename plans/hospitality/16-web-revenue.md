# Phase 16 — Web: RevenueApp

---

## 16.1 Revenue Dashboard

Route: `/revenue/dashboard`

```tsx
export function RevenueDashboardPage() {
  const [dateRange, setDateRange] = useState({ from: startOfMonth(), to: today() });
  const { data } = useQuery({
    queryKey: ["revenue-metrics", dateRange],
    queryFn: () => hspApi.get(`/revenue/metrics?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Revenue</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Occupancy" value={`${data?.occupancy.toFixed(1)}%`} />
        <KpiCard label="ADR" value={<AmountDisplay amount={data?.ADR} />} />
        <KpiCard label="RevPAR" value={<AmountDisplay amount={data?.revPAR} />} />
        <KpiCard label="Total Revenue" value={<AmountDisplay amount={data?.totalRevenue} />} />
      </div>

      {/* Channel mix */}
      <Card>
        <CardHeader><CardTitle>Channel Mix</CardTitle></CardHeader>
        <CardContent>
          <ChannelMixChart data={data?.channelMix} />
        </CardContent>
      </Card>

      {/* Room type performance */}
      <DataTable
        columns={[
          { accessorKey: "name", header: "Room Type" },
          { accessorKey: "occupancy", header: "Occupancy", cell: ({ row }) => `${row.original.occupancy.toFixed(1)}%` },
          { accessorKey: "adr", header: "ADR", cell: ({ row }) => <AmountDisplay amount={row.original.adr} /> },
        ]}
        data={data?.topRoomTypes ?? []}
      />
    </div>
  );
}
```

---

## 16.2 Rate Plans Page

Route: `/revenue/rate-plans`

```tsx
export function RatePlansPage() {
  const { data: plans } = useQuery({ queryKey: ["rate-plans"], queryFn: () => hspApi.get("/admin/rate-plans") });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">Rate Plans</h1>
        <Button onClick={() => navigate("/revenue/rate-plans/new")}>New Rate Plan</Button>
      </div>

      <DataTable
        columns={[
          { accessorKey: "code", header: "Code", cell: ({ row }) => <code>{row.original.code}</code> },
          { accessorKey: "name", header: "Name" },
          { accessorKey: "type", header: "Type" },
          { accessorKey: "mealPlan", header: "Meal Plan", cell: ({ row }) => MEAL_PLAN_LABELS[row.original.mealPlan] },
          { accessorKey: "cancellationPolicy", header: "Cancellation",
            cell: ({ row }) => row.original.cancellationPolicy.type },
          { accessorKey: "isActive", header: "Active",
            cell: ({ row }) => <Switch checked={row.original.isActive} onCheckedChange={v => togglePlan(row.original.id, v)} /> },
          { id: "actions", cell: ({ row }) => (
            <Button size="sm" variant="ghost" onClick={() => navigate(`/revenue/rate-plans/${row.original.id}`)}>Edit</Button>
          )},
        ]}
        data={plans?.ratePlans ?? []}
      />
    </div>
  );
}

const MEAL_PLAN_LABELS = { ep: "Room Only", cp: "Bed & Breakfast", map: "Half Board", ap: "Full Board" };
```

---

## 16.3 Rate Plan Detail Page

Route: `/revenue/rate-plans/:id`

Tabs: Prices | Overrides | Calendar

```tsx
export function RatePlanDetailPage() {
  const { id } = useParams();
  const { data: plan } = useRatePlan(id);

  return (
    <Tabs defaultValue="prices">
      <TabsContent value="prices">
        <RoomTypePricesTable ratePlanId={id} prices={plan?.prices} />
      </TabsContent>

      <TabsContent value="overrides">
        <div className="flex justify-between mb-4">
          <h3 className="font-medium">Date Overrides</h3>
          <Button size="sm" onClick={() => openBulkOverrideDialog()}>Bulk Override</Button>
        </div>
        <DataTable
          columns={overrideColumns}
          data={plan?.overrides ?? []}
        />
      </TabsContent>

      <TabsContent value="calendar">
        <RateCalendar ratePlanId={id} />
      </TabsContent>
    </Tabs>
  );
}
```

---

## 16.4 Rate Calendar Component

Shows a month view with rates per day. Cells colored by occupancy:

```tsx
function RateCalendar({ ratePlanId }) {
  const [month, setMonth] = useState(currentMonth());
  const { data: overrides } = useQuery({ queryKey: ["overrides", ratePlanId, month], queryFn: () => fetchOverrides(ratePlanId, month) });
  const { data: occupancy } = useQuery({ queryKey: ["occupancy", month], queryFn: () => fetchOccupancy(month) });

  return (
    <div>
      <CalendarNav month={month} onChange={setMonth} />
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth(month).map(date => {
          const override = overrides?.find(o => o.date === date);
          const occ = occupancy?.find(o => o.date === date);
          const occPct = occ?.occupancyPct ?? 0;
          const bgColor = occPct > 85 ? "bg-green-100" : occPct > 60 ? "bg-amber-50" : occPct < 30 ? "bg-red-50" : "";

          return (
            <div key={date} className={cn("border rounded p-2 text-xs cursor-pointer hover:bg-muted", bgColor, override?.stopSell && "opacity-40")}>
              <p className="font-medium">{new Date(date).getDate()}</p>
              <p className="text-muted-foreground">{override?.rate ?? "Base"}</p>
              {override?.stopSell && <p className="text-red-500">Stop</p>}
              {occ && <p className="text-xs">{occPct}%</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 16.5 Channel Sync Page

Route: `/revenue/channel-sync`

```tsx
export function ChannelSyncPage() {
  const { data: inventory } = useQuery({ queryKey: ["channel-inventory"], queryFn: () => hspApi.get("/revenue/channel-sync"), refetchInterval: 120_000 });
  const sync = useMutation({ mutationFn: () => hspApi.post("/revenue/channel-sync") });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">Channel Sync</h1>
        <Button onClick={() => sync.mutateAsync()} disabled={sync.isPending}>
          {sync.isPending ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* Stale channels alert */}
      {inventory?.channels.filter(c => c.isStale).map(c => (
        <Alert key={c.channel} variant="destructive">
          <AlertDescription>
            {c.channel} last synced {timeAgo(c.lastSyncAt)}. Data may be outdated.
          </AlertDescription>
        </Alert>
      ))}

      {/* Channel table */}
      <DataTable columns={channelColumns} data={inventory?.channels ?? []} />
    </div>
  );
}
```
