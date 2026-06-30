import { createRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { Route as crmLayoutRoute } from "../layout"
import { crmApi } from "../../lib/api"
import {
  PageHeader,
  Button,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  ConfirmDialog,
  Skeleton,
} from "@projectx/ui"
import { Plus, CheckCircle } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/tickets",
  component: TicketsPage,
})

const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"]
const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"]

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "secondary",
  in_progress: "outline",
  resolved: "default",
  closed: "outline",
}

const PRIORITY_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  low: "secondary",
  medium: "outline",
  high: "default",
  urgent: "destructive",
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
]

const EMPTY_FORM = { subject: "", description: "", priority: "medium", contactId: "" }

function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [resolveId, setResolveId] = useState<string | null>(null)

  async function load(page = 1) {
    setLoading(true)
    const params: Record<string, any> = { page: String(page), limit: "20" }
    if (statusFilter) params.status = statusFilter
    const { data } = await crmApi.getTickets(params)
    if (data) {
      setTickets(data.data ?? [])
      setPagination(data.pagination)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await crmApi.createTicket(formData)
    if (!error) { setShowCreate(false); setFormData(EMPTY_FORM); load(pagination.page) }
    setSubmitting(false)
  }

  async function handleResolve() {
    if (!resolveId) return
    await crmApi.resolveTicket(resolveId)
    setResolveId(null)
    load(pagination.page)
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Tickets"
        description="Customer support tickets"
        actions={
          <Button size="sm" onClick={() => { setFormData(EMPTY_FORM); setShowCreate(true) }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Ticket
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <Button key={f.value} variant={statusFilter === f.value ? "default" : "outline"} size="sm"
            onClick={() => { setStatusFilter(f.value); load(1) }}>
            {f.label}
          </Button>
        ))}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((__, j) => <TableCell key={j}><Skeleton className="h-3.5 w-24" /></TableCell>)}
                    <TableCell />
                  </TableRow>
                ))
              : tickets.length === 0
              ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No tickets</TableCell></TableRow>
              : tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{t.subject}</p>
                        {t.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={PRIORITY_VARIANTS[t.priority] ?? "outline"}>{t.priority ?? "medium"}</Badge></TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[t.status] ?? "outline"}>{t.status ?? "open"}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      {t.status !== "resolved" && t.status !== "closed" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" title="Resolve"
                          onClick={() => setResolveId(t.id)}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">{pagination.page} / {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => load(pagination.page + 1)}>Next</Button>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Ticket</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving..." : "Create Ticket"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!resolveId} onOpenChange={(open) => { if (!open) setResolveId(null) }}
        title="Resolve Ticket" description="Mark this ticket as resolved."
        confirmLabel="Resolve" onConfirm={handleResolve}
      />
    </div>
  )
}
