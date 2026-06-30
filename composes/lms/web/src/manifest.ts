import type { ComposeManifest } from "@projectx/shared-router";

function ManifestIcon(_props: { className?: string }) {
  return null;
}

export const lmsManifest: ComposeManifest = {
  id: "lms",
  label: "LMS",
  icon: ManifestIcon,
  prefix: "/learn",
  navItems: [
    { label: "Learner", path: "/learn/dashboard", icon: ManifestIcon },
    { label: "Instructor", path: "/teach/dashboard", icon: ManifestIcon },
    { label: "Admin", path: "/lms-admin/dashboard", icon: ManifestIcon },
    { label: "Verify Certificate", path: "/lms/verify/$code", icon: ManifestIcon },
  ],
  description: "Learning management",
};
