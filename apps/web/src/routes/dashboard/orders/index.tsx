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
import { mockOrders, type MockOrder } from "@/lib/mock-data";
import { Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/orders/",
  component: OrdersList,
});

function OrdersList() {
  const navigate = useNavigate();

  const columns: ColumnDef<MockOrder>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <SortableHeader column={column}>Order ID</SortableHeader>
      ),
      cell: ({ row }) => (
        <Button
          variant="link"
          className="p-0 h-auto font-medium"
          onClick={() =>
            navigate({
              to: "/dashboard/orders/$orderId",
              params: { orderId: row.original.id },
            })
          }
        >
          {row.original.id}
        </Button>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.customerName}</p>
          <p className="text-sm text-muted-foreground">
            {row.original.customerEmail}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />,
    },
    {
      accessorKey: "total",
      header: ({ column }) => (
        <SortableHeader column={column}>Total</SortableHeader>
      ),
      cell: ({ row }) => <MoneyDisplay amount={row.original.total} />,
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => <DateDisplay date={row.original.createdAt} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Manage and track all customer orders"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
            All
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
            Pending
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
            Processing
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
            Shipped
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
            Delivered
          </Badge>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={mockOrders}
        searchPlaceholder="Search orders..."
      />
    </div>
  );
}
