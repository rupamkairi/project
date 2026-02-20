import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import {
  PageHeader,
  StatusBadge,
  MoneyDisplay,
  DateDisplay,
} from "@/components/shared";
import { DataTable, SortableHeader } from "@/components/data-table";
import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";
import { mockCustomers, type MockCustomer } from "@/lib/mock-data";
import { Plus, MoreHorizontal, Eye, UserX, Mail } from "lucide-react";
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
  path: "/customers/",
  component: CustomersList,
});

function CustomersList() {
  const columns: ColumnDef<MockCustomer>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column}>Customer</SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">{row.original.name[0]}</span>
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-sm text-muted-foreground">
              {row.original.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "orders",
      header: "Orders",
      cell: ({ row }) => <span>{row.original.orders}</span>,
    },
    {
      accessorKey: "totalSpent",
      header: "Total Spent",
      cell: ({ row }) => <MoneyDisplay amount={row.original.totalSpent} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "joinedAt",
      header: "Joined",
      cell: ({ row }) => <DateDisplay date={row.original.joinedAt} />,
    },
    {
      id: "actions",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <UserX className="h-4 w-4 mr-2" />
              Suspend
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage customer accounts"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Customers</p>
            <p className="text-2xl font-bold">{mockCustomers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold">
              {mockCustomers.filter((c) => c.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Suspended</p>
            <p className="text-2xl font-bold">
              {mockCustomers.filter((c) => c.status === "suspended").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Lifetime Value</p>
            <p className="text-2xl font-bold">
              <MoneyDisplay
                amount={mockCustomers.reduce((sum, c) => sum + c.totalSpent, 0)}
              />
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={mockCustomers}
        searchPlaceholder="Search customers..."
      />
    </div>
  );
}
