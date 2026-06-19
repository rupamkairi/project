import { createRoute } from "@tanstack/react-router"
import { Route as dashboardLayoutRoute } from "./dashboard.layout"
import { useState, useEffect } from "react"
import { platformApi } from "../lib/api/platform"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  StatusBadge,
  ConfirmDialog,
  Skeleton,
} from "@projectx/ui"
import { Plus, Search, Pencil, UserX, UserCheck, Trash2 } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/users",
  component: UsersPage,
})

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Suspended", value: "suspended" },
]

function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  })

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: "suspend" | "delete"
    userId: string
  } | null>(null)

  const loadUsers = async (page = 1) => {
    setIsLoading(true)
    const { data } = await platformApi.getUsers({
      page,
      limit: 20,
      search,
      status: statusFilter || undefined,
    })
    if (data) {
      setUsers(data.data)
      setPagination(data.pagination)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadUsers(1)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    loadUsers(1)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { data, error } = await platformApi.createUser({
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      password: formData.password,
    })
    if (!error && data) {
      setShowCreateModal(false)
      setFormData({ email: "", firstName: "", lastName: "", password: "" })
      loadUsers(pagination.page)
    }
    setIsSubmitting(false)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setIsSubmitting(true)
    const { data, error } = await platformApi.updateUser(selectedUser.id, {
      firstName: formData.firstName,
      lastName: formData.lastName,
    })
    if (!error && data) {
      setShowEditModal(false)
      setSelectedUser(null)
      setFormData({ email: "", firstName: "", lastName: "", password: "" })
      loadUsers(pagination.page)
    }
    setIsSubmitting(false)
  }

  const openEditModal = (user: any) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      password: "",
    })
    setShowEditModal(true)
  }

  const handleActivate = async (id: string) => {
    await platformApi.activateUser(id)
    loadUsers(pagination.page)
  }

  const handleConfirmAction = async () => {
    if (!confirmDialog) return
    setIsSubmitting(true)
    if (confirmDialog.type === "suspend") {
      await platformApi.suspendUser(confirmDialog.userId)
    } else {
      await platformApi.deleteUser(confirmDialog.userId)
    }
    setIsSubmitting(false)
    setConfirmDialog(null)
    loadUsers(pagination.page)
  }

  const initials = (user: any) =>
    [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Users"
        description="Manage platform users and their access"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setFormData({ email: "", firstName: "", lastName: "", password: "" })
              setShowCreateModal(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add User
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-64"
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
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{initials(user)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditModal(user)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {user.status === "active" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() =>
                            setConfirmDialog({ open: true, type: "suspend", userId: user.id })
                          }
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {user.status === "suspended" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-primary hover:text-primary/80"
                          onClick={() => handleActivate(user.id)}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {user.status !== "deleted" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() =>
                            setConfirmDialog({ open: true, type: "delete", userId: user.id })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
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
            onClick={() => loadUsers(pagination.page - 1)}
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
            onClick={() => loadUsers(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-email">Email Address *</Label>
              <Input
                id="create-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-firstName">First Name</Label>
              <Input
                id="create-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-lastName">Last Name</Label>
              <Input
                id="create-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password">Password *</Label>
              <Input
                id="create-password"
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 8 characters"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input value={formData.email} disabled className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-firstName">First Name</Label>
              <Input
                id="edit-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-lastName">Last Name</Label>
              <Input
                id="edit-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm: Suspend / Delete */}
      <ConfirmDialog
        open={!!confirmDialog?.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null)
        }}
        title={confirmDialog?.type === "suspend" ? "Suspend User" : "Delete User"}
        description={
          confirmDialog?.type === "suspend"
            ? "This user will be suspended and logged out immediately."
            : "This action cannot be undone."
        }
        confirmLabel={confirmDialog?.type === "suspend" ? "Suspend" : "Delete"}
        onConfirm={handleConfirmAction}
        loading={isSubmitting}
      />
    </div>
  )
}
