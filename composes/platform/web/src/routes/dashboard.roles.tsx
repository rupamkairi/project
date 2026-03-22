import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";
import { useState, useEffect } from "react";
import { platformApi } from "../lib/api/platform";
import { Shield, Pencil, Trash2, Plus, Users, Check, X } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/roles",
  component: RolesPage,
});

// Available permissions for the platform
const AVAILABLE_PERMISSIONS = [
  {
    id: "users:read",
    name: "View Users",
    description: "Can view user list and details",
  },
  {
    id: "users:write",
    name: "Manage Users",
    description: "Can create, update, and delete users",
  },
  {
    id: "roles:read",
    name: "View Roles",
    description: "Can view role list and details",
  },
  {
    id: "roles:write",
    name: "Manage Roles",
    description: "Can create, update, and delete roles",
  },
  {
    id: "invites:read",
    name: "View Invites",
    description: "Can view invite list",
  },
  {
    id: "invites:write",
    name: "Manage Invites",
    description: "Can create and manage invites",
  },
  {
    id: "notifications:read",
    name: "View Notifications",
    description: "Can view notification settings",
  },
  {
    id: "notifications:write",
    name: "Manage Notifications",
    description: "Can manage notification templates",
  },
  {
    id: "settings:read",
    name: "View Settings",
    description: "Can view platform settings",
  },
  {
    id: "settings:write",
    name: "Manage Settings",
    description: "Can update platform settings",
  },
];

function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [roleMembers, setRoleMembers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    isDefault: false,
  });

  const loadRoles = async (page = 1) => {
    setIsLoading(true);
    const { data } = await platformApi.getRoles({ page, limit: 20 });
    if (data) {
      setRoles(data.data);
      setPagination(data.pagination);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data, error } = await platformApi.createRole({
      name: formData.name,
      description: formData.description,
      permissions: formData.permissions,
    });

    if (!error && data) {
      setShowCreateModal(false);
      setFormData({
        name: "",
        description: "",
        permissions: [],
        isDefault: false,
      });
      loadRoles(pagination.page);
    }

    setIsSubmitting(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setIsSubmitting(true);

    const { data, error } = await platformApi.updateRole(selectedRole.id, {
      name: formData.name,
      description: formData.description,
      permissions: formData.permissions,
    });

    if (!error && data) {
      setShowEditModal(false);
      setSelectedRole(null);
      setFormData({
        name: "",
        description: "",
        permissions: [],
        isDefault: false,
      });
      loadRoles(pagination.page);
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const role = roles.find((r) => r.id === id);
    if (!role) return;

    if (role.isSystem) {
      alert("Cannot delete system roles");
      return;
    }
    if (role.isDefault) {
      alert("Cannot delete default roles");
      return;
    }
    if (role.memberCount > 0) {
      alert("Cannot delete roles with assigned members");
      return;
    }

    if (confirm("Are you sure you want to delete this role?")) {
      await platformApi.deleteRole(id);
      loadRoles(pagination.page);
    }
  };

  const openEditModal = (role: any) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions || [],
      isDefault: role.isDefault,
    });
    setShowEditModal(true);
  };

  const openMembersModal = async (role: any) => {
    setSelectedRole(role);
    const { data } = await platformApi.getRole(role.id);
    if (data) {
      setRoleMembers(data.members || []);
    }
    setShowMembersModal(true);
  };

  const openAssignModal = async () => {
    setSelectedUsers([]);
    const { data: usersData } = await platformApi.getUsers({ limit: 100 });
    if (usersData) {
      setAvailableUsers(usersData.data || []);
    }
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedRole || selectedUsers.length === 0) return;

    setIsSubmitting(true);
    const { error } = await platformApi.assignRole(
      selectedRole.id,
      selectedUsers,
    );

    if (!error) {
      setShowAssignModal(false);
      setSelectedUsers([]);
      loadRoles(pagination.page);
      // Refresh members
      const { data } = await platformApi.getRole(selectedRole.id);
      if (data) {
        setRoleMembers(data.members || []);
      }
    }

    setIsSubmitting(false);
  };

  const handleRevoke = async (actorId: string) => {
    if (!selectedRole) return;

    if (confirm("Are you sure you want to revoke this role from this user?")) {
      await platformApi.revokeRole(selectedRole.id, [actorId]);
      const { data } = await platformApi.getRole(selectedRole.id);
      if (data) {
        setRoleMembers(data.members || []);
      }
      loadRoles(pagination.page);
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Roles</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage roles and permissions for the platform
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => {
              setFormData({
                name: "",
                description: "",
                permissions: [],
                isDefault: false,
              });
              setShowCreateModal(true);
            }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : roles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No roles found</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Description
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Members
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Permissions
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Type
                  </th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-500" />
                        {role.name}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {role.description || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <button
                        onClick={() => openMembersModal(role)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Users className="h-4 w-4" />
                        {role.memberCount || 0}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className="text-xs">
                        {(role.permissions || []).length} permissions
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <div className="flex gap-1">
                        {role.isSystem && (
                          <span className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 bg-purple-100 text-purple-800">
                            System
                          </span>
                        )}
                        {role.isDefault && (
                          <span className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 bg-gray-100 text-gray-800">
                            Default
                          </span>
                        )}
                        {!role.isSystem && !role.isDefault && (
                          <span className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 bg-blue-100 text-blue-800">
                            Custom
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex justify-end gap-2">
                        {!role.isSystem && (
                          <>
                            <button
                              onClick={() => openEditModal(role)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(role.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                onClick={() => loadRoles(page)}
                className={`px-3 py-1 rounded ${
                  page === pagination.page
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {page}
              </button>
            ),
          )}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={() => setShowCreateModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Create Role</h2>
              <form onSubmit={handleCreate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Content Manager"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Brief description of the role"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label key={perm.id} className="flex items-start">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                permissions: [...formData.permissions, perm.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                permissions: formData.permissions.filter(
                                  (id) => id !== perm.id,
                                ),
                              });
                            }
                          }}
                          className="mt-1 mr-2"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {perm.name}
                          </span>
                          <p className="text-xs text-gray-500">
                            {perm.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Creating..." : "Create Role"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={() => setShowEditModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Edit Role</h2>
              <form onSubmit={handleEdit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label key={perm.id} className="flex items-start">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                permissions: [...formData.permissions, perm.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                permissions: formData.permissions.filter(
                                  (id) => id !== perm.id,
                                ),
                              });
                            }
                          }}
                          className="mt-1 mr-2"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {perm.name}
                          </span>
                          <p className="text-xs text-gray-500">
                            {perm.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && selectedRole && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={() => setShowMembersModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  Members - {selectedRole.name}
                </h2>
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {roleMembers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No members in this role
                </p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {roleMembers.map((member) => (
                    <li
                      key={member.id}
                      className="py-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                      <button
                        onClick={() => handleRevoke(member.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={openAssignModal}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Assign Members
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Members Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={() => setShowAssignModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Assign Members</h2>

              <div className="space-y-2 mb-4">
                {availableUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center p-2 border rounded-md hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(
                            selectedUsers.filter((id) => id !== user.id),
                          );
                        }
                      }}
                      className="mr-3"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={isSubmitting || selectedUsers.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Assigning..."
                    : `Assign (${selectedUsers.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
