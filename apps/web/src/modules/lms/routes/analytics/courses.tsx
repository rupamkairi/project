import { createRoute } from "@tanstack/react-router";
import { Route as lmsLayoutRoute } from "../layout";
import { PageHeader } from "../../components/shared/page-header";
import type { ColumnDef } from "@tanstack/react-table";
import { mockCourseAnalytics } from "../../lib/mock-data";
import { DataTable, SortableHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";

export const Route = createRoute({
  getParentRoute: () => lmsLayoutRoute,
  path: "/analytics/courses",
  component: CourseAnalytics,
});

const columns: ColumnDef<(typeof mockCourseAnalytics)[0]>[] = [
  {
    accessorKey: "courseTitle",
    header: ({ column }) => (
      <SortableHeader column={column}>Course</SortableHeader>
    ),
  },
  {
    accessorKey: "enrollments",
    header: ({ column }) => (
      <SortableHeader column={column}>Enrollments</SortableHeader>
    ),
  },
  {
    accessorKey: "completionRate",
    header: ({ column }) => (
      <SortableHeader column={column}>Completion Rate</SortableHeader>
    ),
    cell: ({ row }) => <span>{row.original.completionRate}%</span>,
  },
  {
    accessorKey: "avgScore",
    header: ({ column }) => (
      <SortableHeader column={column}>Avg Score</SortableHeader>
    ),
    cell: ({ row }) => <span>{row.original.avgScore}%</span>,
  },
  {
    accessorKey: "rating",
    header: ({ column }) => (
      <SortableHeader column={column}>Rating</SortableHeader>
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.rating.toFixed(1)}</Badge>
    ),
  },
  {
    accessorKey: "revenue",
    header: ({ column }) => (
      <SortableHeader column={column}>Revenue</SortableHeader>
    ),
    cell: ({ row }) => <span>${row.original.revenue.toLocaleString()}</span>,
  },
];

function CourseAnalytics() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Analytics"
        description="Per-course performance metrics"
      />
      <DataTable
        columns={columns}
        data={mockCourseAnalytics}
        searchPlaceholder="Search courses..."
      />
    </div>
  );
}
