import { createRoute } from "@tanstack/react-router";
import { Route as lmsLayoutRoute } from "../layout";
import { PageHeader } from "../../components/shared/page-header";
import { DataTable, SortableHeader, ActionCell } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { mockLearners } from "../../lib/mock-data";
import { LearnerStatusBadge } from "../../components/shared/status-badge";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import type { Learner } from "../../types";

export const Route = createRoute({
  getParentRoute: () => lmsLayoutRoute,
  path: "/learners",
  component: LearnersList,
});

const columns: ColumnDef<Learner>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <SortableHeader column={column}>Name</SortableHeader>
    ),
    cell: ({ row }) => (
      <Link
        to="/lms/learners/$learnerId"
        params={{ learnerId: row.original.id }}
        className="font-medium hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "enrolledCourseCount",
    header: ({ column }) => (
      <SortableHeader column={column}>Enrolled</SortableHeader>
    ),
  },
  { accessorKey: "completedCourses", header: "Completed" },
  {
    accessorKey: "lastActive",
    header: "Last Active",
    cell: ({ row }) => format(new Date(row.original.lastActive), "MMM d, yyyy"),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <LearnerStatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    cell: () => (
      <ActionCell
        actions={[
          { label: "View Profile", onClick: () => {} },
          { label: "Suspend", onClick: () => {}, destructive: true },
        ]}
      />
    ),
  },
];

function LearnersList() {
  return (
    <div className="space-y-6">
      <PageHeader title="Learners" description="All learners on the platform">
        <Badge variant="secondary">{mockLearners.length} learners</Badge>
      </PageHeader>
      <DataTable
        columns={columns}
        data={mockLearners}
        searchPlaceholder="Search learners..."
      />
    </div>
  );
}
