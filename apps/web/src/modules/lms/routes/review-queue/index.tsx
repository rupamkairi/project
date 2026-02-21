import { createRoute } from "@tanstack/react-router";
import { Route as lmsLayoutRoute } from "../layout";
import { PageHeader } from "../../components/shared/page-header";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { mockWorkflowInstances } from "../../lib/mock-data";
import { WorkflowStageBadge } from "../../components/shared/status-badge";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";

export const Route = createRoute({
  getParentRoute: () => lmsLayoutRoute,
  path: "/review-queue",
  component: ReviewQueue,
});

const columns: ColumnDef<(typeof mockWorkflowInstances)[0]>[] = [
  {
    accessorKey: "course",
    header: "Course",
    cell: ({ row }) => (
      <Link
        to="/lms/review-queue/$workflowInstanceId"
        params={{ workflowInstanceId: row.original.id }}
        className="font-medium hover:underline"
      >
        {row.original.course.title}
      </Link>
    ),
  },
  {
    accessorKey: "course.instructor",
    header: "Instructor",
    cell: ({ row }) => row.original.course.instructor.name,
  },
  {
    accessorKey: "stage",
    header: "Stage",
    cell: ({ row }) => <WorkflowStageBadge stage={row.original.stage} />,
  },
  {
    accessorKey: "tasks",
    header: "Tasks",
    cell: ({ row }) => {
      const completed = row.original.tasks.filter(
        (t) => t.status === "completed",
      ).length;
      return (
        <Badge variant="outline">
          {completed}/{row.original.tasks.length}
        </Badge>
      );
    },
  },
  {
    accessorKey: "submittedAt",
    header: "Submitted",
    cell: ({ row }) =>
      format(new Date(row.original.submittedAt), "MMM d, yyyy"),
  },
];

function ReviewQueue() {
  return (
    <div className="space-y-6">
      <PageHeader title="Review Queue" description="Courses pending review">
        <Badge variant="secondary">
          {mockWorkflowInstances.length} pending
        </Badge>
      </PageHeader>

      <DataTable
        columns={columns}
        data={mockWorkflowInstances}
        searchPlaceholder="Search..."
      />
    </div>
  );
}
