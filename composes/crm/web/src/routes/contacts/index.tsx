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
  Avatar,
  AvatarFallback,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  ConfirmDialog,
  Skeleton,
} from "@projectx/ui"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/contacts",
  component: ContactsPage,
})

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Archived", value: "archived" },
]

function scoreVariant(score: number): "secondary" | "outline" | "default" | "destructive" {
  if (score >= 80) return "default"
  if (score >= 60) return "default"
  if (score >= 30) return "outline"
  return "secondary"
}

const EMPTY_FORM = { firstName: "", lastName: "", email: "", phone: "", title: "", department: "", accountId: "" }

function ContactsPage() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<any[]>([])
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

  async function load(page = 1) {
    setLoading(true)
    const params: Record<string, any> = { page: String(page), limit: "20" }
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    const { data } = await crmApi.getContacts(params)
    if (data) {
      setContacts(data.data ?? [])
      setPagination(data.pagination)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await crmApi.createContact(formData)
    if (!error) { setShowCreate(false); setFormData(EMPTY_FORM); load(pagination.page) }
    setSubmitting(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    const { error } = await crmApi.updateContact(selected.id, formData)
    if (!error) { setShowEdit(false); setSelected(null); setFormData(EMPTY_FORM); load(pagination.page) }
    setSubmitting(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    await crmApi.deleteContact(deleteId)
    setDeleteId(null)
    load(pagination.page)
  }

  function openEdit(contact: any) {
    setSelected(contact)
    setFormData({
      firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      title: contact.title ?? "",
      department: contact.department ?? "",
      accountId: contact.accountId ?? "",
    })
    setShowEdit(true)
  }

  const initials = (c: any) =>
    [c.firstName?.[0], c.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Contacts"
        description="Manage your contacts and relationships"
        actions={
          <Button size="sm" onClick={() => { setFormData(EMPTY_FORM); setShowCreate(true) }}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Contact
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); load(1) }} className="flex gap-2">
          <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-64" />
          <Button type="submit" variant="outline" size="sm"><Search className="h-4 w-4" /></Button>
        </form>
        <div className="flex gap-1.5">
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
              <TableHead>Title</TableHead>
              <TableHead>Lead Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-3.5 w-32" /></div></TableCell>
                    <TableCell><Skeleton className="h-3.5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              : contacts.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No contacts found</TableCell>
                </TableRow>
              )
              : contacts.map((c) => {
                  const score = Number(c.meta?.leadScore ?? 0)
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate({ to: "/crm/contacts/$contactId", params: { contactId: c.id } })}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{initials(c)}</AvatarFallback></Avatar>
                          <span className="text-sm font-medium">{c.firstName} {c.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.email}</TableCell>
                      <TableCell className="text-muted-foreground">{c.title ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={scoreVariant(score)}>{score}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.status ?? "active"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
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

      <ContactFormDialog
        open={showCreate} onOpenChange={setShowCreate} title="Add Contact"
        formData={formData} setFormData={setFormData} onSubmit={handleCreate}
        submitting={submitting} submitLabel="Create Contact"
      />
      <ContactFormDialog
        open={showEdit} onOpenChange={setShowEdit} title="Edit Contact"
        formData={formData} setFormData={setFormData} onSubmit={handleEdit}
        submitting={submitting} submitLabel="Save Changes"
      />
      <ConfirmDialog
        open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Contact" description="This action cannot be undone."
        confirmLabel="Delete" onConfirm={handleDelete}
      />
    </div>
  )
}

function ContactFormDialog({ open, onOpenChange, title, formData, setFormData, onSubmit, submitting, submitLabel }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving..." : submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
