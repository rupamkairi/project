import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { Card, CardHeader, CardTitle, CardContent, DataTable, Button, Input, Label } from "@projectx/ui"
import { AmountDisplay } from "../../../../components/shared/AmountDisplay"

export function LmsRevenueReportPage() {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [dateFrom, setDateFrom] = useState(startOfMonth.toISOString().split("T")[0])
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0])

  const { data } = useQuery({
    queryKey: ["lms-revenue", dateFrom, dateTo],
    queryFn: () =>
      lmsApi.get<any>(
        `/admin/analytics/revenue?dateFrom=${dateFrom}&dateTo=${dateTo}&granularity=day`,
      ),
  })

  const revenueColumns = [
    { accessorKey: "title", header: "Course" },
    { accessorKey: "enrollments", header: "Enrollments" },
    {
      accessorKey: "gross",
      header: "Gross",
      cell: ({ row }: any) => <AmountDisplay amount={row.original.gross} />,
    },
    {
      accessorKey: "refunds",
      header: "Refunds",
      cell: ({ row }: any) => <AmountDisplay amount={row.original.refunds} />,
    },
    {
      accessorKey: "net",
      header: "Net",
      cell: ({ row }: any) => <AmountDisplay amount={row.original.net} />,
    },
  ]

  const couponColumns = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "usedCount", header: "Uses" },
    {
      accessorKey: "discountTotal",
      header: "Discount Given",
      cell: ({ row }: any) => <AmountDisplay amount={row.original.discountTotal} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Revenue Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track course revenue and coupon usage
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="space-y-0.5">
          <Label htmlFor="from" className="text-xs">
            From
          </Label>
          <Input
            id="from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-0.5">
          <Label htmlFor="to" className="text-xs">
            To
          </Label>
          <Input
            id="to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Course</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={revenueColumns} data={data?.byCourse ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coupon Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={couponColumns} data={data?.byCoupon ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
