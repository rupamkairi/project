# Phase 18 — Web: LMS Reports

---

## 18.1 Admin Analytics Page

Route: `/lms-admin/analytics`

Tabs: Overview | Revenue | Courses | Learners

---

## 18.2 Revenue Report Page

```tsx
export function LmsRevenueReportPage() {
  const [range, setRange] = useState({ from: startOfMonth(), to: today() });
  const { data } = useQuery({
    queryKey: ["lms-revenue", range],
    queryFn: () => lmsApi.get(`/admin/analytics/revenue?dateFrom=${range.from}&dateTo=${range.to}&granularity=day`),
  });

  return (
    <div className="space-y-6">
      <DateRangePicker value={range} onChange={setRange} />

      {/* Revenue over time chart */}
      <Card>
        <CardHeader><CardTitle>Revenue Over Time</CardTitle></CardHeader>
        <CardContent>
          <BarChart data={data?.byPeriod} xKey="period" bars={[
            { key: "gross", label: "Gross", color: "var(--chart-1)" },
            { key: "refunds", label: "Refunds", color: "var(--chart-destructive)" },
            { key: "net", label: "Net", color: "var(--chart-2)" },
          ]} />
        </CardContent>
      </Card>

      {/* By course */}
      <DataTable
        title="By Course"
        columns={[
          { accessorKey: "title", header: "Course" },
          { accessorKey: "enrollments", header: "Enrollments" },
          { accessorKey: "gross", header: "Gross", cell: ({ row }) => <AmountDisplay amount={row.original.gross} /> },
          { accessorKey: "refunds", header: "Refunds", cell: ({ row }) => <AmountDisplay amount={row.original.refunds} /> },
          { accessorKey: "net", header: "Net", cell: ({ row }) => <AmountDisplay amount={row.original.net} /> },
        ]}
        data={data?.byCourse ?? []}
      />

      {/* Coupon usage */}
      <DataTable
        title="Coupon Usage"
        columns={[
          { accessorKey: "code", header: "Code" },
          { accessorKey: "usedCount", header: "Uses" },
          { accessorKey: "discountTotal", header: "Discount Given", cell: ({ row }) => <AmountDisplay amount={row.original.discountTotal} /> },
        ]}
        data={data?.byCoupon ?? []}
      />
    </div>
  );
}
```

---

## 18.3 Instructor Analytics Overview

Route: `/teach/analytics`

Summary across all instructor's courses:

```tsx
export function InstructorAnalyticsOverviewPage() {
  const { data } = useQuery({ queryKey: ["instructor-overview"], queryFn: () => lmsApi.get("/instructor/analytics/overview") });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Students" value={data?.totalStudents} />
        <StatCard label="Avg Rating" value={`★ ${data?.avgRating?.toFixed(1)}`} />
        <StatCard label="Revenue (MTD)" value={<AmountDisplay amount={data?.mtdRevenue} />} />
      </div>

      <DataTable
        columns={[
          { accessorKey: "title", header: "Course" },
          { accessorKey: "enrollments", header: "Enrolled" },
          { accessorKey: "completionRate", header: "Completion", cell: ({ row }) => `${row.original.completionRate}%` },
          { accessorKey: "rating", header: "Rating", cell: ({ row }) => `★ ${row.original.rating?.toFixed(1) ?? "—"}` },
          { accessorKey: "revenue", header: "Revenue", cell: ({ row }) => <AmountDisplay amount={row.original.revenue} /> },
        ]}
        data={data?.courses ?? []}
        onRowClick={c => navigate(`/teach/courses/${c.courseId}/analytics`)}
      />
    </div>
  );
}
```

---

## 18.4 LMS Config Page

Route: `/lms-admin/config`

(Covered in Phase 15. Also includes certificate template preview.)

---

## 18.5 Coupon Management Page

Route: `/lms-admin/coupons`

```tsx
export function AdminCouponsPage() {
  const { data } = useQuery({ queryKey: ["coupons"], queryFn: () => lmsApi.get("/admin/coupons") });
  const create = useMutation({ mutationFn: (data) => lmsApi.post("/admin/coupons", data) });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">Coupons</h1>
        <CreateCouponDialog onCreate={data => create.mutateAsync(data)} />
      </div>

      <DataTable
        columns={[
          { accessorKey: "code", header: "Code", cell: ({ row }) => <code>{row.original.code}</code> },
          { accessorKey: "type", header: "Type" },
          { accessorKey: "value", header: "Value",
            cell: ({ row }) => row.original.type === "percentage" ? `${row.original.value}%` : <AmountDisplay amount={row.original.value} /> },
          { accessorKey: "usedCount", header: "Used",
            cell: ({ row }) => `${row.original.usedCount}${row.original.maxUses ? ` / ${row.original.maxUses}` : ""}` },
          { accessorKey: "expiresAt", header: "Expires",
            cell: ({ row }) => row.original.expiresAt ? formatDate(row.original.expiresAt) : "Never" },
          { accessorKey: "isActive", header: "Active",
            cell: ({ row }) => <Switch checked={row.original.isActive} onCheckedChange={v => toggleCoupon(row.original.id, v)} /> },
        ]}
        data={data?.coupons ?? []}
      />
    </div>
  );
}
```
