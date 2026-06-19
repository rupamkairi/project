import { createRoute } from "@tanstack/react-router"
import { Route as dashboardLayoutRoute } from "./dashboard.layout"
import { useState, useEffect } from "react"
import { platformApi } from "../lib/api/platform"
import {
  PageHeader,
  Button,
  Input,
  Label,
  Checkbox,
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
  StatusBadge,
  ConfirmDialog,
  Skeleton,
} from "@projectx/ui"
import { Plus, Search, RefreshCcw, Trash2, Copy, Check } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/invites",
  component: InvitesPage,
})

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Expired", value: "expired" },
]

function InvitesPage() {
  const [invites, setInvites] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState<{ open: boolean; inviteId: string | null }>({
    open: false,
    inviteId: null,
  })

  const [formData, setFormData] = useState({ email: "", roleIds: [] as string[] })

  const loadInvites = async (page = 1) => {
    setIsLoading(true)
    const { data } = await platformApi.getInvites({
      page,
      limit: 20,
      search,
      status: statusFilter || undefined,
    })
    if (data) {
      setInvites(data.data)
      setPagination(data.pagination)
    }
    setIsLoading(false)
  }

  const loadRoles = async () => {
    const { data } = await platformApi.getRoles({ limit: 100 })
    if (data) setRoles(data.data)
  }

  useEffect(() => {
    loadInvites()
    loadRoles()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadInvites(1)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    loadInvites(1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { data, error } = await platformApi.createInvite({
      email: formData.email,
      roleIds: formData.roleIds,
    })
    if (data && !error) {
      setInviteLink(
        data.inviteLink || `${window.location.origin}/register?token=${data.token}`,
      )
      setShowLinkModal(true)
      setShowModal(false)
      setFormData({ email: "", roleIds: [] })
      loadInvites(pagination.page)
    }
    setIsSubmitting(false)
  }

  const handleResend = async (id: string) => {
    const { data } = await platformApi.resendInvite(id)
    if (data) {
      setInviteLink(
        data.inviteLink || `${window.location.origin}/register?token=${data.token}`,
      )
      setShowLinkModal(true)
    }
  }

  const handleRevokeConfirm = async () => {
    if (!confirmRevoke.inviteId) return
    await platformApi.deleteInvite(confirmRevoke.inviteId)
    setConfirmRevoke({ open: false, inviteId: null })
    loadInvites(pagination.page)
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Invites"
        description="Manage user invitations to the platform"
        actions={
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Invite User
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-56"
          />
          <Button type="submit" variant="outline" size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Invited By</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : invites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No invites found
                </TableCell>
              </TableRow>
            ) : (
              invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium text-sm">{invite.email}</TableCell>
                  <TableCell>
                    <StatusBadge status={invite.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {invite.roleIds?.length > 0
                      ? roles
                          .filter((r) => invite.roleIds.includes(r.id))
                          .map((r) => r.name)
                          .join(", ")
                      : "No roles"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {invite.invitedBy}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {invite.status === "pending" && (
                      <div className="flex justify-end items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleResend(invite.id)}
                          title="Resend"
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() =>
                            setConfirmRevoke({ open: true, inviteId: invite.id })
                          }
                          title="Revoke"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => loadInvites(pagination.page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => loadInvites(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Invite User Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Assign Roles (optional)</Label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.roleIds.includes(role.id)}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData,
                          roleIds: checked
                            ? [...formData.roleIds, role.id]
                            : formData.roleIds.filter((id) => id !== role.id),
                        })
                      }}
                    />
                    <span className="text-sm">{role.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Created</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Share this link with the user. Expires in 7 days.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={inviteLink} className="text-xs" />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => copyToClipboard(inviteLink)}
            >
              {copied ? (
                <Check className="h-4 w-4 text-foreground" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setShowLinkModal(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Revoke */}
      <ConfirmDialog
        open={confirmRevoke.open}
        onOpenChange={(open) => {
          if (!open) setConfirmRevoke({ open: false, inviteId: null })
        }}
        title="Revoke Invite"
        description="Revoke this invite? The user will no longer be able to use the link."
        confirmLabel="Revoke"
        onConfirm={handleRevokeConfirm}
      />
    </div>
  )
}
