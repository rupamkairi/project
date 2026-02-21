import { createRoute } from "@tanstack/react-router";
import { Route as dashboardLayoutRoute } from "../__dashboard";
import { PageHeader } from "@/components/lms/page-header";
import { DataTable, SortableHeader, ActionCell } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { mockCourses } from "@/lib/mock-data";
import { CourseStatusBadge } from "@/components/lms/status-badge";
import { Link } from "@tanstack/react-router";
import type { Course } from "@/types/lms";

export const Route = createRoute({
  getParentRoute: () => dashboardLayoutRoute,
  path: "/courses",
  component: CoursesList,
});

const columns: ColumnDef<Course>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <SortableHeader column={column}>Title</SortableHeader>
    ),
    cell: ({ row }) => (
      <Link
        to="/dashboard/courses/$courseId"
        params={{ courseId: row.original.id }}
        className="font-medium hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: "instructor",
    header: "Instructor",
    cell: ({ row }) => row.original.instructor.name,
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <CourseStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "enrolledCount",
    header: ({ column }) => (
      <SortableHeader column={column}>Enrolled</SortableHeader>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.rating > 0 ? row.original.rating.toFixed(1) : "N/A"}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: () => (
      <ActionCell
        actions={[
          {
            label: "View Details",
            onClick: () => {},
          },
          {
            label: "Edit",
            onClick: () => {},
          },
        ]}
      />
    ),
  },
];

function CoursesList() {
  return (
    <div className="space-y-6">
      <PageHeader title="Courses" description="All courses across the platform">
        <Badge variant="secondary">{mockCourses.length} courses</Badge>
      </PageHeader>

      <DataTable
        columns={columns}
        data={mockCourses}
        searchPlaceholder="Search courses..."
      />
    </div>
  );
}
