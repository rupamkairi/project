import { createRoute } from "@tanstack/react-router";
import { Route as lmsLayoutRoute } from "../layout";
import { PageHeader } from "../../components/shared/page-header";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { NOTIFICATION_TEMPLATES } from "../../types";
import { ChannelBadge } from "../../components/shared/status-badge";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";

export const Route = createRoute({
  getParentRoute: () => lmsLayoutRoute,
  path: "/notifications",
  component: NotificationsList,
});

const columns: ColumnDef<(typeof NOTIFICATION_TEMPLATES)[0]>[] = [
  {
    accessorKey: "key",
    header: "Key",
    cell: ({ row }) => (
      <Link
        to="/lms/notifications/$templateKey"
        params={{ templateKey: row.original.key }}
        className="font-mono text-sm hover:underline"
      >
        {row.original.key}
      </Link>
    ),
  },
  {
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => <ChannelBadge channel={row.original.channel} />,
  },
  {
    accessorKey: "triggerDescription",
    header: "Trigger",
  },
  {
    accessorKey: "updatedAt",
    header: "Last Updated",
    cell: ({ row }) => format(new Date(row.original.updatedAt), "MMM d, yyyy"),
  },
];

function NotificationsList() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Templates"
        description="Manage notification templates"
      >
        <Badge variant="secondary">
          {NOTIFICATION_TEMPLATES.length} templates
        </Badge>
      </PageHeader>

      <DataTable
        columns={columns}
        data={NOTIFICATION_TEMPLATES}
        searchPlaceholder="Search templates..."
      />
    </div>
  );
}
