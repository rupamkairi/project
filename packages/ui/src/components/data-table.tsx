import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table"
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
} from "@tanstack/react-table"
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageCount?: number
  pageIndex?: number
  pageSize?: number
  onRowSelectionChange?: (selection: RowSelectionState) => void
  onSortingChange?: (sorting: SortingState) => void
  onSearchChange?: (search: string) => void
  searchPlaceholder?: string
  showSearch?: boolean
  showColumnVisibility?: boolean
  showPagination?: boolean
  className?: string
}

function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  pageIndex = 0,
  pageSize = 10,
  onRowSelectionChange,
  onSortingChange,
  onSearchChange,
  searchPlaceholder = "Search...",
  showSearch = true,
  showColumnVisibility = false,
  showPagination = true,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = React.useState<
    Record<string, boolean>
  >({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater
      setSorting(newSorting)
      onSortingChange?.(newSorting)
    },
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater
      setRowSelection(newSelection)
      onRowSelectionChange?.(newSelection)
    },
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnVisibility,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    pageCount: pageCount ?? -1,
    manualPagination: true,
    manualSorting: true,
  })

  return (
    <div className={cn("space-y-3", className)}>
      {showSearch && (
        <div className="flex items-center gap-2">
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter ?? ""}
            onChange={(event) => {
              setGlobalFilter(event.target.value)
              onSearchChange?.(event.target.value)
            }}
            className="h-8 max-w-xs"
          />
          {showColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto">
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-16 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

function SortableHeader({
  column,
  children,
}: {
  column: { toggleSorting: (asc: boolean) => void; getIsSorted: () => string | false }
  children: React.ReactNode
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="-ml-3 h-8 data-[state=open]:bg-accent"
    >
      {children}
      {{
        asc: <ChevronUp className="ml-1.5 h-3.5 w-3.5" />,
        desc: <ChevronDown className="ml-1.5 h-3.5 w-3.5" />,
      }[column.getIsSorted() as string] ?? null}
    </Button>
  )
}

interface ActionItem<TData> {
  label: string
  onClick: (row: TData) => void
  icon?: React.ReactNode
  destructive?: boolean
}

function ActionCell<TData>({
  row,
  actions,
}: {
  row: TData
  actions: ActionItem<TData>[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onClick={() => action.onClick(row)}
            variant={action.destructive ? "destructive" : "default"}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { DataTable, SortableHeader, ActionCell }
export type { DataTableProps }
