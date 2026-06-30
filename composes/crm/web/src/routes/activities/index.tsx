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
import { Plus, Phone, Mail, Calendar, FileText, Activity, Trash2 } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/activities",
  component: ActivitiesPage,
})

const ACTIVITY_TYPES = ["call", "email", "meeting", "note", "task", "log"]

const TYPE_ICONS: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: Activity,
  log: FileText,
}

const TYPE_FILTERS = [
  { label: "All", value: "" },
  { label: "Calls", value: "call" },
  { label: "Emails", value: "email" },
  { label: "Meetings", value: "meeting" },
  { label: "Notes", value: "note" },
  { label: "Tasks", value: "task" },
]

function timeAgo(date: string): string {
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? "Yesterday" : `${days}d ago`
}

const EMPTY_FORM = { type: "call", subject: "", notes: "", contactId: "", dealId: "", scheduledAt: "" }

function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load(page = 1) {
    setLoading(true)
    const params: Record<string, any> = { page: String(page), limit: "20" }
    if (typeFilter) params.type = typeFilter
    const { data } = await crmApi.getActivities(params)
    if (data) {
      setActivities(data.data ?? [])
      setPagination(data.pagination)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await crmApi.createActivity(formData)
    if (!error) { setShowCreate(false); setFormData(EMPTY_FORM); load(pagination.page) }
    setSubmitting(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    await crmApi.deleteActivity(deleteId)
    setDeleteId(null)
    load(pagination.page)
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Activities"
        description="Log calls, emails, meetings, and more"
        actions={
          <Button size="sm" onClick={() => { setFormData(EMPTY_FORM); setShowCreate(true) }}>
            <Plus className="h-4 w-4 mr-1.5" /> Log Activity
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map((f) => (
          <Button key={f.value} variant={typeFilter === f.value ? "default" : "outline"} size="sm"
            onClick={() => { setTypeFilter(f.value); load(1) }}>
            {f.label}
          </Button>
        ))}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>When</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-3.5 w-24" /></TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                ))
              : activities.length === 0
              ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No activities</TableCell></TableRow>
              : activities.map((a) => {
                  const Icon = TYPE_ICONS[a.type] ?? FileText
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <Badge variant="outline" className="text-xs">{a.type}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{a.subject ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs">
                        <span className="line-clamp-1">{a.notes ?? "—"}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{a.createdAt ? timeAgo(a.createdAt) : "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
          <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Scheduled At</Label>
              <Input type="datetime-local" value={formData.scheduledAt} onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })} />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving..." : "Log Activity"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Activity" description="This action cannot be undone."
        confirmLabel="Delete" onConfirm={handleDelete}
      />
    </div>
  )
}
