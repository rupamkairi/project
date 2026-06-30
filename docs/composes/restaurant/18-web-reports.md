# Phase 18 — Web: Reports

---

## 18.1 Sales Report Page

Route: `/restaurant-admin/analytics/sales`

```tsx
export function SalesReportPage() {
  const [range, setRange] = useState({ from: startOfMonth(), to: today() });
  const [outletId] = useOutletStore(s => [s.outletId]);
  const { data } = useQuery({
    queryKey: ["rst-sales", outletId, range],
    queryFn: () => rstApi.get(`/analytics/sales?outletId=${outletId}&dateFrom=${range.from}&dateTo=${range.to}&granularity=day`),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">Sales Report</h1>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader><CardTitle>Revenue by Day</CardTitle></CardHeader>
        <CardContent>
          <BarChart data={data?.byDay} xKey="date" bars={[
            { key: "dineIn", label: "Dine-in" },
            { key: "delivery", label: "Delivery" },
            { key: "takeaway", label: "Takeaway" },
          ]} />
        </CardContent>
      </Card>

      {/* Channel mix */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>By Channel</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.channelMix.map(c => (
                <div key={c.channel} className="flex justify-between text-sm">
                  <span className="capitalize">{c.channel}</span>
                  <span>{c.pct.toFixed(1)}% · <AmountDisplay amount={c.revenue} /></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Orders Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span>Total Orders</span><span>{data?.orders.total}</span></div>
            <div className="flex justify-between text-sm"><span>Avg Order Value</span><AmountDisplay amount={data?.orders.avgOrderValue} /></div>
            <div className="flex justify-between text-sm"><span>Peak Hour</span><span>{data?.orders.peakHour}</span></div>
            <div className="flex justify-between text-sm text-red-500"><span>Rejected</span><span>{data?.orders.rejected}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 18.2 Kitchen Report Page

Route: `/restaurant-admin/analytics/kitchen`

```tsx
export function KitchenReportPage() {
  const { data } = useKitchenAnalytics();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Avg KOT TAT" value={`${data?.avgKitchenTatMinutes.toFixed(1)}min`} />
        <StatCard label="SLA Breach" value={`${data?.slaBreachPct.toFixed(1)}%`} color={data?.slaBreachPct > 15 ? "red" : "green"} />
        <StatCard label="Acceptance TAT (P90)" value={`${data?.acceptanceTime.p90.toFixed(1)}min`} />
      </div>

      <Card>
        <CardHeader><CardTitle>TAT by Station</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { accessorKey: "station", header: "Station" },
              { accessorKey: "avgTat", header: "Avg TAT", cell: ({ row }) => `${row.original.avgTat.toFixed(1)}min` },
              { accessorKey: "p90Tat", header: "P90 TAT", cell: ({ row }) => `${row.original.p90Tat.toFixed(1)}min` },
              { accessorKey: "kotsProcessed", header: "KOTs" },
            ]}
            data={data?.avgKitchenTatByStation ?? []}
          />
        </CardContent>
      </Card>

      {/* TAT by hour heat map */}
      <Card>
        <CardHeader><CardTitle>TAT by Hour</CardTitle></CardHeader>
        <CardContent>
          <TatHeatMap data={data?.avgKitchenTatByHour} />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 18.3 Shift Report Page

Route: `/restaurant-admin/shifts/:id/report`

```tsx
export function ShiftReportPage() {
  const { id } = useParams();
  const { data: shift } = useQuery({ queryKey: ["shift-report", id], queryFn: () => rstApi.get(`/analytics/shifts/${id}`) });

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl font-semibold">Shift Report</h1>
          <p className="text-sm text-muted-foreground">{formatDate(shift?.startedAt)} · {shift?.cashierName}</p>
        </div>
        <StatusBadge status={shift?.status} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Orders" value={shift?.orderCount} />
        <StatCard label="Revenue" value={<AmountDisplay amount={shift?.totalRevenue} />} />
        <StatCard label="Cash Variance" value={<AmountDisplay amount={shift?.variance} />}
          color={Math.abs(shift?.variance ?? 0) > 50 ? "red" : "green"} />
      </div>

      <Card>
        <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {shift?.paymentBreakdown.map(p => (
              <div key={p.method} className="flex justify-between text-sm">
                <span className="capitalize">{p.method}</span>
                <span>{p.count} transactions · <AmountDisplay amount={p.total} /></span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 18.4 Table Reservation Page

Route: `/restaurant-admin/reservations`

```tsx
export function TableReservationsPage() {
  const { data } = useQuery({ queryKey: ["table-reservations"], queryFn: () => rstApi.get(`/admin/outlets/${outletId}/table-reservations?date=${today()}`) });

  return (
    <DataTable
      columns={[
        { accessorKey: "guestName", header: "Guest" },
        { accessorKey: "phone", header: "Phone" },
        { accessorKey: "partySize", header: "Party" },
        { accessorKey: "reservedAt", header: "Time", cell: ({ row }) => formatTime(row.original.reservedAt) },
        { accessorKey: "tableNumber", header: "Table" },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        { id: "actions", cell: ({ row }) => row.original.status === "confirmed" ? (
          <Button size="sm" onClick={() => seatGuest(row.original.id)}>Seat</Button>
        ) : null },
      ]}
      data={data?.reservations ?? []}
    />
  );
}
```
