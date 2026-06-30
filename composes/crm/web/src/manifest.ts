import type { ComposeManifest } from "@projectx/shared-router";

function ManifestIcon(_props: { className?: string }) {
  return null;
}

export const crmManifest: ComposeManifest = {
  id: "crm",
  label: "CRM",
  icon: ManifestIcon,
  prefix: "/crm",
  navItems: [
    { label: "Dashboard", path: "/crm", icon: ManifestIcon },
    { label: "Contacts", path: "/crm/contacts", icon: ManifestIcon },
    { label: "Accounts", path: "/crm/accounts", icon: ManifestIcon },
    { label: "Leads", path: "/crm/leads", icon: ManifestIcon },
    { label: "Deals", path: "/crm/deals", icon: ManifestIcon },
    { label: "Activities", path: "/crm/activities", icon: ManifestIcon },
    { label: "Campaigns", path: "/crm/campaigns", icon: ManifestIcon },
    { label: "Segments", path: "/crm/segments", icon: ManifestIcon },
    { label: "Tickets", path: "/crm/tickets", icon: ManifestIcon },
  ],
  description: "Customer relationship management",
};
