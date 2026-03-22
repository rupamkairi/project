import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "./dashboard.layout";
import { useState, useEffect } from "react";
import { platformApi } from "../lib/api/platform";
import { Mail, Copy, RefreshCcw, Trash2, Plus } from "lucide-react";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/invites",
  component: InvitesPage,
});

function InvitesPage() {
  const [invites, setInvites] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    roleIds: [] as string[],
  });

  const loadInvites = async (page = 1) => {
    setIsLoading(true);
    const { data } = await platformApi.getInvites({
      page,
      limit: 20,
      search,
      status: statusFilter || undefined,
    });
    if (data) {
      setInvites(data.data);
      setPagination(data.pagination);
    }
    setIsLoading(false);
  };

  const loadRoles = async () => {
    const { data } = await platformApi.getRoles({ limit: 100 });
    if (data) {
      setRoles(data.data);
    }
  };

  useEffect(() => {
    loadInvites();
    loadRoles();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvites(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    loadInvites(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data, error } = await platformApi.createInvite({
      email: formData.email,
      roleIds: formData.roleIds,
    });

    if (data && !error) {
      setInviteLink(
        data.inviteLink ||
          `${window.location.origin}/register?token=${data.token}`,
      );
      setShowLinkModal(true);
      setShowModal(false);
      setFormData({ email: "", roleIds: [] });
      loadInvites(pagination.page);
    }

    setIsSubmitting(false);
  };

  const handleResend = async (id: string) => {
    const { data } = await platformApi.resendInvite(id);
    if (data) {
      setInviteLink(
        data.inviteLink ||
          `${window.location.origin}/register?token=${data.token}`,
      );
      setShowLinkModal(true);
    }
  };

  const handleRevoke = async (id: string) => {
    if (confirm("Are you sure you want to revoke this invite?")) {
      await platformApi.deleteInvite(id);
      loadInvites(pagination.page);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      case "revoked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invites</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage user invitations to the platform
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
          >
            Search
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
            onClick={() => handleStatusFilter("pending")}
            className={`px-3 py-2 text-sm rounded-md ${
              statusFilter === "pending"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => handleStatusFilter("accepted")}
            className={`px-3 py-2 text-sm rounded-md ${
              statusFilter === "accepted"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => handleStatusFilter("expired")}
            className={`px-3 py-2 text-sm rounded-md ${
              statusFilter === "expired"
                ? "bg-gray-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Expired
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : invites.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No invites found
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Roles
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Invited By
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Expires
                  </th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                      {invite.email}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadgeClass(invite.status)}`}
                      >
                        {invite.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {invite.roleIds?.length > 0
                        ? roles
                            .filter((r) => invite.roleIds.includes(r.id))
                            .map((r) => r.name)
                            .join(", ")
                        : "No roles"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {invite.invitedBy}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex justify-end gap-2">
                        {invite.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleResend(invite.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Resend"
                            >
                              <RefreshCcw className="h-4 w-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleRevoke(invite.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Revoke"
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

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                onClick={() => loadInvites(page)}
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

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={() => setShowModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold mb-4">Invite User</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
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
                    Assign Roles (optional)
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {roles.map((role) => (
                      <label key={role.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.roleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                roleIds: [...formData.roleIds, role.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                roleIds: formData.roleIds.filter(
                                  (id) => id !== role.id,
                                ),
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{role.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Sending..." : "Send Invite"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-25"
              onClick={() => setShowLinkModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold mb-4">Invite Created</h2>
              <p className="text-sm text-gray-600 mb-4">
                Share this link with the user. The link will expire in 7 days.
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
                <button
                  onClick={() => copyToClipboard(inviteLink)}
                  className="p-2 bg-gray-200 rounded-md hover:bg-gray-300"
                  title="Copy"
                >
                  <Copy className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
