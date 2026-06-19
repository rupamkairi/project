import { createRoute } from "@tanstack/react-router"
import { Route as dashboardLayoutRoute } from "./dashboard.layout"
import { useState, useEffect } from "react"
import { platformApi } from "../lib/api/platform"
import {
  PageHeader,
  Button,
  Input,
  Label,
  Textarea,
  Checkbox,
  Badge,
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
  Skeleton,
  Alert,
  AlertDescription,
} from "@projectx/ui"
import { Shield, Plus, Users, Pencil, Trash2 } from "lucide-react"

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/roles",
  component: RolesPage,
})

const AVAILABLE_PERMISSIONS = [
  { id: "users:read", name: "View Users", description: "Can view user list and details" },
  { id: "users:write", name: "Manage Users", description: "Can create, update, and delete users" },
  { id: "roles:read", name: "View Roles", description: "Can view role list and details" },
  { id: "roles:write", name: "Manage Roles", description: "Can create, update, and delete roles" },
  { id: "invites:read", name: "View Invites", description: "Can view invite list" },
  { id: "invites:write", name: "Manage Invites", description: "Can create and manage invites" },
  { id: "notifications:read", name: "View Notifications", description: "Can view notification settings" },
  { id: "notifications:write", name: "Manage Notifications", description: "Can manage notification templates" },
  { id: "settings:read", name: "View Settings", description: "Can view platform settings" },
  { id: "settings:write", name: "Manage Settings", description: "Can update platform settings" },
]

function RolesPage() {
  const [roles, setRoles] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const [isLoading, setIsLoading] = useState(true)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [roleMembers, setRoleMembers] = useState<any[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; role: any | null }>({
    open: false,
    role: null,
  })
  const [confirmRevoke, setConfirmRevoke] = useState<{ open: boolean; actorId: string | null }>({
    open: false,
    actorId: null,
  })

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  })

  const loadRoles = async (page = 1) => {
    setIsLoading(true)
    const { data } = await platformApi.getRoles({ page, limit: 20 })
    if (data) {
      setRoles(data.data)
      setPagination(data.pagination)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadRoles()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { data, error } = await platformApi.createRole({
      name: formData.name,
      description: formData.description,
      permissions: formData.permissions,
    })
    if (!error && data) {
      setShowCreateModal(false)
      setFormData({ name: "", description: "", permissions: [] })
      loadRoles(pagination.page)
    }
    setIsSubmitting(false)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return
    setIsSubmitting(true)
    const { data, error } = await platformApi.updateRole(selectedRole.id, {
      name: formData.name,
      description: formData.description,
      permissions: formData.permissions,
    })
    if (!error && data) {
      setShowEditModal(false)
      setSelectedRole(null)
      setFormData({ name: "", description: "", permissions: [] })
      loadRoles(pagination.page)
    }
    setIsSubmitting(false)
  }

  const openEditModal = (role: any) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || [],
    })
    setShowEditModal(true)
  }

  const openDeleteConfirm = (role: any) => {
    if (role.isSystem) {
      setDeleteError("Cannot delete system roles")
      return
    }
    if (role.isDefault) {
      setDeleteError("Cannot delete default roles")
      return
    }
    if (role.memberCount > 0) {
      setDeleteError("Cannot delete roles with assigned members")
      return
    }
    setDeleteError(null)
    setConfirmDelete({ open: true, role })
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDelete.role) return
    setIsSubmitting(true)
    await platformApi.deleteRole(confirmDelete.role.id)
    setIsSubmitting(false)
    setConfirmDelete({ open: false, role: null })
    loadRoles(pagination.page)
  }

  const openMembersModal = async (role: any) => {
    setSelectedRole(role)
    const { data } = await platformApi.getRole(role.id)
    if (data) setRoleMembers(data.members || [])
    setShowMembersModal(true)
  }

  const openAssignModal = async () => {
    setSelectedUsers([])
    const { data: usersData } = await platformApi.getUsers({ limit: 100 })
    if (usersData) setAvailableUsers(usersData.data || [])
    setShowAssignModal(true)
  }

  const handleAssign = async () => {
    if (!selectedRole || selectedUsers.length === 0) return
    setIsSubmitting(true)
    const { error } = await platformApi.assignRole(selectedRole.id, selectedUsers)
    if (!error) {
      setShowAssignModal(false)
      setSelectedUsers([])
      loadRoles(pagination.page)
      const { data } = await platformApi.getRole(selectedRole.id)
      if (data) setRoleMembers(data.members || [])
    }
    setIsSubmitting(false)
  }

  const handleRevokeConfirm = async () => {
    if (!selectedRole || !confirmRevoke.actorId) return
    setIsSubmitting(true)
    await platformApi.revokeRole(selectedRole.id, [confirmRevoke.actorId])
    const { data } = await platformApi.getRole(selectedRole.id)
    if (data) setRoleMembers(data.members || [])
    loadRoles(pagination.page)
    setIsSubmitting(false)
    setConfirmRevoke({ open: false, actorId: null })
  }

  const togglePermission = (id: string, checked: boolean) => {
    setFormData({
      ...formData,
      permissions: checked
        ? [...formData.permissions, id]
        : formData.permissions.filter((p) => p !== id),
    })
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Roles"
        description="Manage roles and permissions for the platform"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setFormData({ name: "", description: "", permissions: [] })
              setShowCreateModal(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Role
          </Button>
        }
      />

      {deleteError && (
        <Alert variant="destructive">
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No roles found
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                      <span className="font-medium text-sm">{role.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {role.description || "-"}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => openMembersModal(role)}
                      className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm"
                    >
                      <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {role.memberCount || 0}
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {(role.permissions || []).length} permissions
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {role.isSystem && (
                        <Badge
                          variant="secondary"
                          className="bg-secondary text-secondary-foreground"
                        >
                          System
                        </Badge>
                      )}
                      {role.isDefault && <Badge variant="secondary">Default</Badge>}
                      {!role.isSystem && !role.isDefault && (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {!role.isSystem && (
                      <div className="flex justify-end items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditModal(role)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => openDeleteConfirm(role)}
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
            onClick={() => loadRoles(pagination.page - 1)}
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
            onClick={() => loadRoles(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Role Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Role Name *</Label>
              <Input
                id="create-name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Content Manager"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-desc">Description</Label>
              <Textarea
                id="create-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Brief description of the role"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2 max-h-52 overflow-y-auto rounded-md border p-3">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <div key={perm.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`create-${perm.id}`}
                      checked={formData.permissions.includes(perm.id)}
                      onCheckedChange={(checked) => togglePermission(perm.id, !!checked)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`create-${perm.id}`}
                      className="cursor-pointer font-normal leading-none"
                    >
                      <span className="font-medium text-sm">{perm.name}</span>
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        {perm.description}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
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
                {isSubmitting ? "Creating..." : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Role Name *</Label>
              <Input
                id="edit-name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2 max-h-52 overflow-y-auto rounded-md border p-3">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <div key={perm.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`edit-${perm.id}`}
                      checked={formData.permissions.includes(perm.id)}
                      onCheckedChange={(checked) => togglePermission(perm.id, !!checked)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`edit-${perm.id}`}
                      className="cursor-pointer font-normal leading-none"
                    >
                      <span className="font-medium text-sm">{perm.name}</span>
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        {perm.description}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
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

      {/* Members Dialog */}
      <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Members — {selectedRole?.name}</DialogTitle>
          </DialogHeader>
          {roleMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No members in this role
            </p>
          ) : (
            <ul className="divide-y">
              {roleMembers.map((member) => (
                <li key={member.id} className="flex justify-between items-center py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmRevoke({ open: true, actorId: member.id })}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button size="sm" onClick={openAssignModal}>
              Assign Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Members Dialog */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            {availableUsers.map((user) => (
              <label
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-md border cursor-pointer hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={(checked) => {
                    setSelectedUsers(
                      checked
                        ? [...selectedUsers, user.id]
                        : selectedUsers.filter((id) => id !== user.id),
                    )
                  }}
                />
                <div>
                  <p className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAssignModal(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={isSubmitting || selectedUsers.length === 0}
            >
              {isSubmitting ? "Assigning..." : `Assign (${selectedUsers.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete({ open: false, role: null })
        }}
        title="Delete Role"
        description={`Delete "${confirmDelete.role?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        loading={isSubmitting}
      />

      {/* Confirm Revoke */}
      <ConfirmDialog
        open={confirmRevoke.open}
        onOpenChange={(open) => {
          if (!open) setConfirmRevoke({ open: false, actorId: null })
        }}
        title="Remove Member"
        description="Remove this user from the role?"
        confirmLabel="Remove"
        onConfirm={handleRevokeConfirm}
        loading={isSubmitting}
      />
    </div>
  )
}
