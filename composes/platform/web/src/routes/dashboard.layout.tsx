import { createRoute } from "@tanstack/react-router";
import { Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "../stores/auth";
import { sharedRootRoute } from "@projectx/shared-router";

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/dashboard",
  component: DashboardLayout,
});

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "home" },
  { name: "Users", href: "/dashboard/users", icon: "users" },
  { name: "Roles", href: "/dashboard/roles", icon: "shield" },
  { name: "Notifications", href: "/dashboard/notifications", icon: "bell" },
  { name: "Settings", href: "/dashboard/settings", icon: "settings" },
];

function DashboardLayout() {
  const { actor, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <div className=" min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link
                  to="/dashboard"
                  className="text-xl font-bold text-blue-600"
                >
                  Platform
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                    activeProps={{
                      className: "text-blue-600 border-b-2 border-blue-600",
                    }}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {actor?.firstName} {actor?.lastName}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
