import type { ComposeManifest } from "@projectx/shared-router";

function ManifestIcon(_props: { className?: string }) {
  return null;
}

export const platformManifest: ComposeManifest = {
  id: "platform",
  label: "Platform",
  icon: ManifestIcon,
  prefix: "/dashboard",
  navItems: [
    { label: "Dashboard", path: "/dashboard", icon: ManifestIcon },
    { label: "Users", path: "/dashboard/users", icon: ManifestIcon },
    { label: "Roles", path: "/dashboard/roles", icon: ManifestIcon },
    { label: "Invites", path: "/dashboard/invites", icon: ManifestIcon },
    { label: "Notifications", path: "/dashboard/notifications", icon: ManifestIcon },
    { label: "Files", path: "/dashboard/files", icon: ManifestIcon },
  ],
  description: "Platform admin",
};
