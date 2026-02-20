import { createRoute, useNavigate } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../../__dashboard";
import { PageHeader, StatusBadge, MoneyDisplay } from "@/components/shared";
import { DataTable, SortableHeader } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockProducts, type MockProduct } from "@/lib/mock-data";
import { Plus, MoreHorizontal, Pencil, Archive, Eye } from "lucide-react";
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
  path: "/products/",
  component: ProductsList,
});

function ProductsList() {
  const navigate = useNavigate();

  const columns: ColumnDef<MockProduct>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeader column={column}>Product</SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-xs text-gray-500">IMG</span>
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-sm text-muted-foreground">{row.original.slug}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.category}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "variants",
      header: "Variants",
      cell: ({ row }) => <span>{row.original.variants}</span>,
    },
    {
      accessorKey: "priceMin",
      header: "Price",
      cell: ({ row }) => (
        <div>
          <MoneyDisplay amount={row.original.priceMin} />
          {row.original.priceMax !== row.original.priceMin && (
            <span className="text-muted-foreground">
              {" "}
              - <MoneyDisplay amount={row.original.priceMax} />
            </span>
          )}
        </div>
      ),
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
                  to: "/dashboard/products/$productId",
                  params: { productId: row.original.id },
                })
              }
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        actions={
          <Button onClick={() => navigate({ to: "/dashboard/products/new" })}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
          All
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
          Published
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
          Draft
        </Badge>
        <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
          Archived
        </Badge>
      </div>

      <DataTable
        columns={columns}
        data={mockProducts}
        searchPlaceholder="Search products..."
      />
    </div>
  );
}
