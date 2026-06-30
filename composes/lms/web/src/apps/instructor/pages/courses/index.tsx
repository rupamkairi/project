import { useQuery, useMutation } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import {
  Button,
  DataTable,
  StatusBadge,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@projectx/ui"
import { useNavigate } from "@tanstack/react-router"
import { Plus, MoreHorizontal } from "lucide-react"

export function InstructorCoursesPage() {
  const navigate = useNavigate()

  const { data, refetch } = useQuery({
    queryKey: ["instructor-courses"],
    queryFn: () => lmsApi.get<any>("/instructor/courses"),
  })

  const submitForReview = useMutation({
    mutationFn: (id: string) => lmsApi.post(`/instructor/courses/${id}/submit-review`),
    onSuccess: () => refetch(),
  })

  const courses = data?.courses ?? []

  const columns = [
    { accessorKey: "title", header: "Title" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => <StatusBadge status={row.original.status} />,
    },
    { accessorKey: "enrolledCount", header: "Enrolled" },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }: any) =>
        row.original.rating > 0 ? `★ ${row.original.rating.toFixed(1)}` : "—",
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigate({ to: `/teach/courses/${row.original.id}/edit` })}
            >
              Edit
            </DropdownMenuItem>
            {row.original.status === "draft" && (
              <DropdownMenuItem
                onClick={() => submitForReview.mutate(row.original.id)}
              >
                Submit for Review
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => navigate({ to: `/teach/courses/${row.original.id}/analytics` })}
            >
              Analytics
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">My Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your courses
          </p>
        </div>
        <Button size="sm" onClick={() => navigate({ to: "/teach/courses/new" })}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Course
        </Button>
      </div>

      <div className="rounded-md border">
        <DataTable columns={columns} data={courses} />
      </div>
    </div>
  )
}
