import { createRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { Route as crmLayoutRoute } from "../layout"
import { crmApi } from "../../lib/api"
import {
  PageHeader,
  Button,
  Input,
  Label,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
} from "@projectx/ui"
import { Plus, LayoutGrid, List, Pencil, Trash2, MoreHorizontal, ChevronRight } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/deals",
  component: DealsPage,
})

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "secondary",
  won: "default",
  lost: "destructive",
}

const EMPTY_FORM = { name: "", value: "", currency: "USD", pipelineId: "", stageId: "", contactId: "", accountId: "", closeDate: "" }

function formatCurrency(val: any): string {
  const n = Number(val) || 0
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" }).format(n)
}

function DealCard({ deal, stages, onMove, onClick }: { deal: any; stages: any[]; onMove: (stageId: string) => void; onClick: () => void }) {
  const value = Number(deal.value?.amount ?? deal.value ?? 0)
  return (
    <div className="bg-card border rounded-lg p-3 space-y-2 cursor-pointer hover:shadow-sm transition-shadow" onClick={onClick}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium line-clamp-2 flex-1">{deal.name ?? deal.title}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <p className="px-2 py-1 text-xs text-muted-foreground font-medium">Move to</p>
            {stages.map((s) => (
              <DropdownMenuItem key={s.id} onClick={(e) => { e.stopPropagation(); onMove(s.id) }}>
                <ChevronRight className="h-3.5 w-3.5 mr-1" /> {s.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {value > 0 && <p className="text-sm font-semibold text-foreground">{formatCurrency(value)}</p>}
      <Badge variant={STATUS_VARIANTS[deal.status] ?? "outline"} className="text-xs">{deal.status ?? "open"}</Badge>
    </div>
  )
}

function DealsPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<"kanban" | "list">("kanban")
  const [deals, setDeals] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [pipelines, setPipelines] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load(page = 1) {
    setLoading(true)
    const [dealsRes, pipelinesRes] = await Promise.all([
      crmApi.getDeals({ page: String(page), limit: "100" }),
      crmApi.getPipelines(),
    ])
    if (dealsRes.data) { setDeals(dealsRes.data.data ?? []); setPagination(dealsRes.data.pagination) }
    if (pipelinesRes.data) {
      const pList = pipelinesRes.data.data ?? []
      setPipelines(pList)
      const def = pList.find((p: any) => p.isDefault) ?? pList[0]
      if (def) {
        const stagesRes = await crmApi.getPipelineStages(def.id)
        if (stagesRes.data) setStages(Array.isArray(stagesRes.data) ? stagesRes.data : [])
      }
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const payload = { ...formData, value: formData.value ? { amount: Number(formData.value), currency: formData.currency } : undefined }
    const { error } = await crmApi.createDeal(payload)
    if (!error) { setShowCreate(false); setFormData(EMPTY_FORM); load() }
    setSubmitting(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    const payload = { ...formData, value: formData.value ? { amount: Number(formData.value), currency: formData.currency } : undefined }
    const { error } = await crmApi.updateDeal(selected.id, payload)
    if (!error) { setShowEdit(false); setSelected(null); setFormData(EMPTY_FORM); load() }
    setSubmitting(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    await crmApi.deleteDeal(deleteId)
    setDeleteId(null)
    load()
  }

  async function handleMove(dealId: string, stageId: string) {
    await crmApi.moveDeal(dealId, stageId)
    load()
  }

  function openEdit(deal: any) {
    setSelected(deal)
    setFormData({
      name: deal.name ?? deal.title ?? "",
      value: deal.value ? String(deal.value.amount ?? deal.value) : "",
      currency: deal.value?.currency ?? "USD",
      pipelineId: deal.pipelineId ?? "",
      stageId: deal.stageId ?? "",
      contactId: deal.contactId ?? "",
      accountId: deal.accountId ?? "",
      closeDate: deal.closeDate ? deal.closeDate.slice(0, 10) : "",
    })
    setShowEdit(true)
  }

  const dealsByStage = stages.reduce<Record<string, any[]>>((acc, s) => {
    acc[s.id] = deals.filter((d) => d.stageId === s.id)
    return acc
  }, {})

  const DealFormContent = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Deal Name *</Label>
        <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Value</Label>
          <Input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Currency</Label>
          <Input value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Close Date</Label>
        <Input type="date" value={formData.closeDate} onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })} />
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Deals"
        description="Track your sales pipeline"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border overflow-hidden">
              <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" className="rounded-none h-8" onClick={() => setView("kanban")}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button variant={view === "list" ? "default" : "ghost"} size="sm" className="rounded-none h-8" onClick={() => setView("list")}>
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button size="sm" onClick={() => { setFormData(EMPTY_FORM); setShowCreate(true) }}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Deal
            </Button>
          </div>
        }
      />

      {loading ? (
        view === "kanban"
          ? <div className="flex gap-4 overflow-x-auto pb-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="w-64 shrink-0 space-y-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>)}</div>
          : <div className="rounded-md border"><Skeleton className="h-48 w-full" /></div>
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pipeline stages configured.</p>
          ) : stages.map((stage) => {
            const stageDeals = dealsByStage[stage.id] ?? []
            const stageValue = stageDeals.reduce((sum, d) => sum + Number(d.value?.amount ?? d.value ?? 0), 0)
            return (
              <div key={stage.id} className="w-64 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                    {stageValue > 0 && <span className="text-xs font-medium">{formatCurrency(stageValue)}</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  {stageDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} stages={stages.filter((s) => s.id !== stage.id)}
                      onMove={(stageId) => handleMove(deal.id, stageId)}
                      onClick={() => navigate({ to: "/crm/deals/$dealId", params: { dealId: deal.id } })} />
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="h-20 rounded-lg border border-dashed flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">No deals</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Close Date</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.length === 0
                ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No deals</TableCell></TableRow>
                : deals.map((d) => {
                    const stage = stages.find((s) => s.id === d.stageId)
                    return (
                      <TableRow key={d.id} className="cursor-pointer" onClick={() => navigate({ to: "/crm/deals/$dealId", params: { dealId: d.id } })}>
                        <TableCell className="font-medium text-sm">{d.name ?? d.title}</TableCell>
                        <TableCell className="text-sm">{d.value ? formatCurrency(d.value.amount ?? d.value) : "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{stage?.name ?? "—"}</TableCell>
                        <TableCell><Badge variant={STATUS_VARIANTS[d.status] ?? "outline"}>{d.status ?? "open"}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{d.closeDate ? new Date(d.closeDate).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Deal</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <DealFormContent />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving..." : "Create Deal"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Deal</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <DealFormContent />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Deal" description="This action cannot be undone."
        confirmLabel="Delete" onConfirm={handleDelete}
      />
    </div>
  )
}
