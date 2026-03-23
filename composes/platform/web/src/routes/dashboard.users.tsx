import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";
import { useState, useEffect } from "react";
import { platformApi } from "../lib/api/platform";
import { User, Pencil, Trash2, Plus, X, Search } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/users",
  component: UsersPage,
});

function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  });

  const loadUsers = async (page = 1) => {
    setIsLoading(true);
    const { data } = await platformApi.getUsers({
      page,
      limit: 20,
      search,
      status: statusFilter || undefined,
    });
    if (data) {
      setUsers(data.data);
      setPagination(data.pagination);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    loadUsers(1);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data, error } = await platformApi.createUser({
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      password: formData.password,
    });

    if (!error && data) {
      setShowCreateModal(false);
      setFormData({ email: "", firstName: "", lastName: "", password: "" });
      loadUsers(pagination.page);
    }

    setIsSubmitting(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);

    const { data, error } = await platformApi.updateUser(selectedUser.id, {
      firstName: formData.firstName,
      lastName: formData.lastName,
    });

    if (!error && data) {
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({ email: "", firstName: "", lastName: "", password: "" });
      loadUsers(pagination.page);
    }

    setIsSubmitting(false);
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      password: "",
    });
    setShowEditModal(true);
  };

  const handleSuspend = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to suspend this user? They will be logged out immediately.",
      )
    ) {
      await platformApi.suspendUser(id);
      loadUsers(pagination.page);
    }
  };

  const handleActivate = async (id: string) => {
    await platformApi.activateUser(id);
    loadUsers(pagination.page);
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    ) {
      await platformApi.deleteUser(id);
      loadUsers(pagination.page);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      case "deleted":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage platform users and their access
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setFormData({
                email: "",
                firstName: "",
                lastName: "",
                password: "",
              });
              setShowCreateModal(true);
            }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 flex items-center justify-center"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        <div className="flex gap-2">
          <button
            onClick={() => handleStatusFilter("")}
            className={`px-3 py-2 text-sm rounded-md ${
              statusFilter === ""
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleStatusFilter("active")}
            className={`px-3 py-2 text-sm rounded-md ${
              statusFilter === "active"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => handleStatusFilter("pending")}
            className={`px-3 py-2 text-sm rounded-md ${
              statusFilter === "pending"
                ? "bg-yellow-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => handleStatusFilter("suspended")}
            className={`px-3 py-2 text-sm rounded-md ${
              statusFilter === "suspended"
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Suspended
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No users found</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                    User
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Type
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Last Login
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Created
                  </th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadgeClass(user.status)}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.type}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </button>
                        {user.status === "active" && (
                          <button
                            onClick={() => handleSuspend(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Suspend"
                          >
                            Suspend
                          </button>
                        )}
                        {user.status === "suspended" && (
                          <button
                            onClick={() => handleActivate(user.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Activate"
                          >
                            Activate
                          </button>
                        )}
                        {user.status !== "deleted" && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
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
                onClick={() => loadUsers(page)}
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={() => setShowCreateModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Add User</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="user@example.com"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Minimum 8 characters"
                  />
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
                    {isSubmitting ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={() => setShowEditModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Edit User</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleEdit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
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
    </div>
  );
}
