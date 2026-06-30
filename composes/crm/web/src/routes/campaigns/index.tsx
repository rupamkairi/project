import { createRoute, useNavigate } from "@tanstack/react-router"
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
import { Plus, Pencil, Trash2, Send, Pause } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/campaigns",
  component: CampaignsPage,
})

const CAMPAIGN_TYPES = ["email", "sms", "push", "in_app"]
const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed", "cancelled"]

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  active: "default",
  paused: "outline",
  completed: "outline",
  cancelled: "destructive",
}

const EMPTY_FORM = { name: "", type: "email", subject: "", content: "", startDate: "", endDate: "" }

function CampaignsPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<any[]>([])
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
    const { data } = await crmApi.getCampaigns({ page: String(page), limit: "20" })
    if (data) {
      setCampaigns(data.data ?? [])
      setPagination(data.pagination)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await crmApi.createCampaign(formData)
    if (!error) { setShowCreate(false); setFormData(EMPTY_FORM); load(pagination.page) }
    setSubmitting(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    const { error } = await crmApi.updateCampaign(selected.id, formData)
    if (!error) { setShowEdit(false); setSelected(null); setFormData(EMPTY_FORM); load(pagination.page) }
    setSubmitting(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    await crmApi.deleteCampaign(deleteId)
    setDeleteId(null)
    load(pagination.page)
  }

  async function handleSend(id: string) {
    await crmApi.sendCampaign(id)
    load(pagination.page)
  }

  async function handlePause(id: string) {
    await crmApi.pauseCampaign(id)
    load(pagination.page)
  }

  function openEdit(c: any) {
    setSelected(c)
    setFormData({
      name: c.name ?? "",
      type: c.type ?? "email",
      subject: c.subject ?? "",
      content: c.content ?? "",
      startDate: c.startDate ? c.startDate.slice(0, 10) : "",
      endDate: c.endDate ? c.endDate.slice(0, 10) : "",
    })
    setShowEdit(true)
  }

  const CampaignFormContent = ({ fd, setFd }: { fd: typeof EMPTY_FORM; setFd: (v: any) => void }) => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Campaign Name *</Label>
        <Input required value={fd.name} onChange={(e) => setFd({ ...fd, name: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={fd.type} onValueChange={(v) => setFd({ ...fd, type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CAMPAIGN_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Input value={fd.subject} onChange={(e) => setFd({ ...fd, subject: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Content</Label>
        <Textarea value={fd.content} onChange={(e) => setFd({ ...fd, content: e.target.value })} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Start Date</Label>
          <Input type="date" value={fd.startDate} onChange={(e) => setFd({ ...fd, startDate: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>End Date</Label>
          <Input type="date" value={fd.endDate} onChange={(e) => setFd({ ...fd, endDate: e.target.value })} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Campaigns"
        description="Manage marketing campaigns"
        actions={
          <Button size="sm" onClick={() => { setFormData(EMPTY_FORM); setShowCreate(true) }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Campaign
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead className="w-[120px]" />
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
              : campaigns.length === 0
              ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No campaigns</TableCell></TableRow>
              : campaigns.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate({ to: "/crm/campaigns/$campaignId", params: { campaignId: c.id } })}>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.type}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[c.status] ?? "outline"}>{c.status ?? "draft"}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {c.status === "draft" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" title="Send" onClick={() => handleSend(c.id)}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {c.status === "active" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Pause" onClick={() => handlePause(c.id)}>
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
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
          <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <CampaignFormContent fd={formData} setFd={setFormData} />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving..." : "Create Campaign"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Campaign</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <CampaignFormContent fd={formData} setFd={setFormData} />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Campaign" description="This action cannot be undone."
        confirmLabel="Delete" onConfirm={handleDelete}
      />
    </div>
  )
}
