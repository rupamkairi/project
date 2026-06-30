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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  ConfirmDialog,
  Skeleton,
} from "@projectx/ui"
import { Plus, Search, Pencil, Trash2, CheckCircle } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/leads",
  component: LeadsPage,
})

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Qualified", value: "qualified" },
  { label: "Disqualified", value: "disqualified" },
  { label: "Converted", value: "converted" },
]

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "secondary",
  contacted: "outline",
  qualified: "default",
  disqualified: "destructive",
  converted: "default",
}

const EMPTY_FORM = { firstName: "", lastName: "", email: "", phone: "", company: "", title: "", source: "" }

function LeadsPage() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [convertId, setConvertId] = useState<string | null>(null)

  async function load(page = 1) {
    setLoading(true)
    const params: Record<string, any> = { page: String(page), limit: "20" }
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    const { data } = await crmApi.getLeads(params)
    if (data) {
      setLeads(data.data ?? [])
      setPagination(data.pagination)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await crmApi.createLead(formData)
    if (!error) { setShowCreate(false); setFormData(EMPTY_FORM); load(pagination.page) }
    setSubmitting(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    const { error } = await crmApi.updateLead(selected.id, formData)
    if (!error) { setShowEdit(false); setSelected(null); setFormData(EMPTY_FORM); load(pagination.page) }
    setSubmitting(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    await crmApi.deleteLead(deleteId)
    setDeleteId(null)
    load(pagination.page)
  }

  async function handleConvert() {
    if (!convertId) return
    await crmApi.convertLead(convertId)
    setConvertId(null)
    load(pagination.page)
  }

  function openEdit(lead: any) {
    setSelected(lead)
    setFormData({
      firstName: lead.firstName ?? "",
      lastName: lead.lastName ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      company: lead.company ?? "",
      title: lead.title ?? "",
      source: lead.source ?? "",
    })
    setShowEdit(true)
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Leads"
        description="Track and manage potential customers"
        actions={
          <Button size="sm" onClick={() => { setFormData(EMPTY_FORM); setShowCreate(true) }}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Lead
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); load(1) }} className="flex gap-2">
          <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-64" />
          <Button type="submit" variant="outline" size="sm"><Search className="h-4 w-4" /></Button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Button key={f.value} variant={statusFilter === f.value ? "default" : "outline"} size="sm"
              onClick={() => { setStatusFilter(f.value); load(1) }}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[110px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-3.5 w-24" /></TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                ))
              : leads.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No leads found</TableCell>
                </TableRow>
              )
              : leads.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate({ to: "/crm/leads/$leadId", params: { leadId: l.id } })}>
                    <TableCell className="font-medium text-sm">{l.firstName} {l.lastName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{l.email ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{l.company ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{l.source ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[l.status] ?? "outline"}>{l.status ?? "new"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {l.status !== "converted" && l.status !== "disqualified" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" title="Convert"
                            onClick={() => setConvertId(l.id)}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      {[
        { open: showCreate, onOpenChange: setShowCreate, title: "Add Lead", onSubmit: handleCreate, submitLabel: "Create Lead" },
        { open: showEdit, onOpenChange: setShowEdit, title: "Edit Lead", onSubmit: handleEdit, submitLabel: "Save Changes" },
      ].map(({ open, onOpenChange, title, onSubmit, submitLabel }) => (
        <Dialog key={title} open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name *</Label>
                  <Input required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Company</Label>
                  <Input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Input value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} placeholder="web, referral..." />
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving..." : submitLabel}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ))}

      <ConfirmDialog
        open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Lead" description="This action cannot be undone."
        confirmLabel="Delete" onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={!!convertId} onOpenChange={(open) => { if (!open) setConvertId(null) }}
        title="Convert Lead" description="Convert this lead into a contact and deal. This cannot be undone."
        confirmLabel="Convert" onConfirm={handleConvert}
      />
    </div>
  )
}
