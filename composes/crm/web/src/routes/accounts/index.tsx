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
import { Plus, Search, Pencil, Trash2, Building2 } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => crmLayoutRoute,
  path: "/accounts",
  component: AccountsPage,
})

const EMPTY_FORM = { name: "", domain: "", industry: "", employees: "", website: "", phone: "", email: "" }

function AccountsPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
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
    const { data } = await crmApi.getAccounts(params)
    if (data) {
      setAccounts(data.data ?? [])
      setPagination(data.pagination)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const payload = { ...formData, employees: formData.employees ? Number(formData.employees) : undefined }
    const { error } = await crmApi.createAccount(payload)
    if (!error) { setShowCreate(false); setFormData(EMPTY_FORM); load(pagination.page) }
    setSubmitting(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    const payload = { ...formData, employees: formData.employees ? Number(formData.employees) : undefined }
    const { error } = await crmApi.updateAccount(selected.id, payload)
    if (!error) { setShowEdit(false); setSelected(null); setFormData(EMPTY_FORM); load(pagination.page) }
    setSubmitting(false)
  }

  async function handleDelete() {
    if (!deleteId) return
    await crmApi.deleteAccount(deleteId)
    setDeleteId(null)
    load(pagination.page)
  }

  function openEdit(account: any) {
    setSelected(account)
    setFormData({
      name: account.name ?? "",
      domain: account.domain ?? "",
      industry: account.industry ?? "",
      employees: account.employees ? String(account.employees) : "",
      website: account.website ?? "",
      phone: account.phone ?? "",
      email: account.email ?? "",
    })
    setShowEdit(true)
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Accounts"
        description="Manage companies and organizations"
        actions={
          <Button size="sm" onClick={() => { setFormData(EMPTY_FORM); setShowCreate(true) }}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Account
          </Button>
        }
      />

      <form onSubmit={(e) => { e.preventDefault(); load(1) }} className="flex gap-2">
        <Input placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-64" />
        <Button type="submit" variant="outline" size="sm"><Search className="h-4 w-4" /></Button>
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]" />
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
              : accounts.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No accounts found</TableCell>
                </TableRow>
              )
              : accounts.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate({ to: "/crm/accounts/$accountId", params: { accountId: a.id } })}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">{a.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{a.domain ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{a.industry ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{a.employees ? a.employees.toLocaleString() : "—"}</TableCell>
                    <TableCell><Badge variant="outline">{a.status ?? "active"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
        { open: showCreate, onOpenChange: setShowCreate, title: "Add Account", onSubmit: handleCreate, submitLabel: "Create Account" },
        { open: showEdit, onOpenChange: setShowEdit, title: "Edit Account", onSubmit: handleEdit, submitLabel: "Save Changes" },
      ].map(({ open, onOpenChange, title, onSubmit, submitLabel }) => (
        <Dialog key={title} open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Company Name *</Label>
                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Domain</Label>
                  <Input value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} placeholder="example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Industry</Label>
                  <Input value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Employees</Label>
                  <Input type="number" value={formData.employees} onChange={(e) => setFormData({ ...formData, employees: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
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
        title="Delete Account" description="This will remove the account and cannot be undone."
        confirmLabel="Delete" onConfirm={handleDelete}
      />
    </div>
  )
}
