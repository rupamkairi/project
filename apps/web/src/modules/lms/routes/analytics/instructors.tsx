import { createRoute } from "@tanstack/react-router";
import { Route as lmsLayoutRoute } from "../layout";
import { PageHeader } from "../../components/shared/page-header";
import { DataTable, SortableHeader } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { mockInstructorAnalytics } from "../../lib/mock-data";

export const Route = createRoute({
  getParentRoute: () => lmsLayoutRoute,
  path: "/analytics/instructors",
  component: InstructorAnalytics,
});

const columns: ColumnDef<(typeof mockInstructorAnalytics)[0]>[] = [
  {
    accessorKey: "instructorName",
    header: ({ column }) => (
      <SortableHeader column={column}>Instructor</SortableHeader>
    ),
  },
  {
    accessorKey: "activeCourses",
    header: ({ column }) => (
      <SortableHeader column={column}>Active Courses</SortableHeader>
    ),
  },
  {
    accessorKey: "totalEnrolled",
    header: ({ column }) => (
      <SortableHeader column={column}>Total Enrolled</SortableHeader>
    ),
  },
  {
    accessorKey: "avgCompletionRate",
    header: ({ column }) => (
      <SortableHeader column={column}>Avg Completion</SortableHeader>
    ),
    cell: ({ row }) => <span>{row.original.avgCompletionRate}%</span>,
  },
  {
    accessorKey: "totalRevenue",
    header: ({ column }) => (
      <SortableHeader column={column}>Total Revenue</SortableHeader>
    ),
    cell: ({ row }) => (
      <span>${row.original.totalRevenue.toLocaleString()}</span>
    ),
  },
];

function InstructorAnalytics() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Instructor Analytics"
        description="Instructor performance metrics"
      />

      <DataTable
        columns={columns}
        data={mockInstructorAnalytics}
        searchPlaceholder="Search instructors..."
      />
    </div>
  );
}
