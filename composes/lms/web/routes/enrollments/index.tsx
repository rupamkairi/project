import { createRoute } from "@tanstack/react-router";
import { Route as lmsLayoutRoute } from "../layout";
import { PageHeader } from "../../components/shared/page-header";
import { DataTable, SortableHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { mockEnrollments } from "../../lib/mock-data";
import { EnrollmentStatusBadge } from "../../components/shared/status-badge";
import { format } from "date-fns";
import type { Enrollment } from "../../types";

export const Route = createRoute({
  getParentRoute: () => lmsLayoutRoute,
  path: "/enrollments",
  component: EnrollmentsList,
});

const columns: ColumnDef<Enrollment>[] = [
  {
    accessorKey: "learner",
    header: "Learner",
    cell: ({ row }) => row.original.learner.name,
  },
  {
    accessorKey: "course",
    header: "Course",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.course.title}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <EnrollmentStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "enrolledAt",
    header: "Enrolled",
    cell: ({ row }) => format(new Date(row.original.enrolledAt), "MMM d, yyyy"),
  },
  {
    accessorKey: "completionPct",
    header: ({ column }) => (
      <SortableHeader column={column}>Progress</SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary"
            style={{ width: `${row.original.completionPct}%` }}
          />
        </div>
        <span className="text-sm">{row.original.completionPct}%</span>
      </div>
    ),
  },
  {
    accessorKey: "pricePaid",
    header: "Price",
    cell: ({ row }) => (
      <span>
        {row.original.currency} {row.original.pricePaid}
      </span>
    ),
  },
];

function EnrollmentsList() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollments"
        description="Platform-wide enrollment records"
      >
        <Badge variant="secondary">{mockEnrollments.length} enrollments</Badge>
      </PageHeader>
      <DataTable
        columns={columns}
        data={mockEnrollments}
        searchPlaceholder="Search enrollments..."
      />
    </div>
  );
}
