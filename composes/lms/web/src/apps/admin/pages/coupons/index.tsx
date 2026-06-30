import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import {
  Button,
  DataTable,
  Switch,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
} from "@projectx/ui"
import { AmountDisplay, formatDate } from "../../../../components/shared/PriceDisplay"
import { Plus, Loader2 } from "lucide-react"

export function AdminCouponsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [code, setCode] = useState("")
  const [type, setType] = useState("percentage")
  const [value, setValue] = useState("10")
  const [maxUses, setMaxUses] = useState("")

  const { data, refetch } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => lmsApi.get<any>("/admin/coupons"),
  })

  const create = useMutation({
    mutationFn: () =>
      lmsApi.post("/admin/coupons", {
        code: code.toUpperCase(),
        type,
        value: parseFloat(value),
        maxUses: maxUses ? parseInt(maxUses) : undefined,
      }),
    onSuccess: () => {
      setShowCreate(false)
      setCode("")
      setType("percentage")
      setValue("10")
      setMaxUses("")
      refetch()
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      lmsApi.patch(`/admin/coupons/${id}`, { isActive }),
    onSuccess: () => refetch(),
  })

  const columns = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }: any) => <code className="text-xs bg-muted px-1 py-0.5 rounded">{row.original.code}</code>,
    },
    { accessorKey: "type", header: "Type" },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }: any) =>
        row.original.type === "percentage"
          ? `${row.original.value}%`
          : <AmountDisplay amount={row.original.value} />,
    },
    {
      accessorKey: "usedCount",
      header: "Used",
      cell: ({ row }: any) =>
        `${row.original.usedCount ?? 0}${row.original.maxUses ? ` / ${row.original.maxUses}` : ""}`,
    },
    {
      accessorKey: "expiresAt",
      header: "Expires",
      cell: ({ row }: any) =>
        row.original.expiresAt ? formatDate(row.original.expiresAt) : "Never",
    },
    {
      accessorKey: "isActive",
      header: "Active",
      cell: ({ row }: any) => (
        <Switch
          checked={row.original.isActive ?? false}
          onCheckedChange={(v) =>
            toggleActive.mutate({ id: row.original.id, isActive: v })
          }
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Coupons</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage discount coupons
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Coupon
        </Button>
      </div>

      <div className="rounded-md border">
        <DataTable columns={columns} data={data?.coupons ?? []} />
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="coupon-code">Code</Label>
              <Input
                id="coupon-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SAVE20"
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coupon-type">Type</Label>
              <select
                id="coupon-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coupon-value">
                {type === "percentage" ? "Percentage Off" : "Amount Off"}
              </Label>
              <Input
                id="coupon-value"
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coupon-max">Max Uses (blank = unlimited)</Label>
              <Input
                id="coupon-max"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => create.mutate()}
              disabled={create.isPending || !code.trim() || !value}
            >
              {create.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
