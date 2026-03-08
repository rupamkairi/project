import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import {
  PageHeader,
  StatusBadge,
  MoneyDisplay,
  DateDisplay,
} from "@/components/shared";
import { DataTable, SortableHeader } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { mockCoupons, type MockCoupon } from "@/lib/mock-data";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/coupons/",
  component: CouponsList,
});

function CouponsList() {
  const navigate = useNavigate();

  const columns: ColumnDef<MockCoupon>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <SortableHeader column={column}>Code</SortableHeader>
      ),
      cell: ({ row }) => (
        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
          {row.original.code}
        </code>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.type === "percentage" ? "%" : "$"}
        </Badge>
      ),
    },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => (
        <span>
          {row.original.type === "percentage" ? (
            `${row.original.value}%`
          ) : (
            <MoneyDisplay amount={row.original.value} />
          )}
        </span>
      ),
    },
    {
      accessorKey: "usageCount",
      header: "Usage",
      cell: ({ row }) => (
        <span>
          {row.original.usageCount} / {row.original.usageLimit}
        </span>
      ),
    },
    {
      accessorKey: "validTo",
      header: "Valid Until",
      cell: ({ row }) => <DateDisplay date={row.original.validTo} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                navigate({
                  to: "/dashboard/coupons/$couponId",
                  params: { couponId: row.original.id },
                })
              }
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        description="Manage discount coupons and promotions"
        actions={
          <Button onClick={() => navigate({ to: "/dashboard/coupons/new" })}>
            <Plus className="h-4 w-4 mr-2" />
            Create Coupon
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Coupons</p>
            <p className="text-2xl font-bold">
              {mockCoupons.filter((c) => c.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Usage</p>
            <p className="text-2xl font-bold">
              {mockCoupons.reduce((sum, c) => sum + c.usageCount, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Expired</p>
            <p className="text-2xl font-bold">
              {mockCoupons.filter((c) => c.status === "expired").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={mockCoupons}
        searchPlaceholder="Search coupons..."
      />
    </div>
  );
}
