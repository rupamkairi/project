import { useQuery, useMutation } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { Button, StatusBadge } from "@projectx/ui"
import { AmountDisplay } from "../../../../components/shared/PriceDisplay"
import { useNavigate } from "@tanstack/react-router"
import { CheckCircle, XCircle } from "lucide-react"

export function AdminCoursesPage() {
  const navigate = useNavigate()

  const { data, refetch } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => lmsApi.get<any>("/admin/courses"),
  })

  const approve = useMutation({
    mutationFn: (id: string) => lmsApi.post(`/admin/courses/${id}/approve`),
    onSuccess: () => refetch(),
  })

  const reject = useMutation({
    mutationFn: (id: string) => lmsApi.post(`/admin/courses/${id}/reject`),
    onSuccess: () => refetch(),
  })

  const courses = data?.courses ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Courses</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage all courses across the platform
        </p>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">Title</th>
              <th className="text-left p-3 font-medium">Instructor</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Enrolled</th>
              <th className="text-left p-3 font-medium">Price</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {courses.map((c: any) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium">{c.title}</td>
                <td className="p-3 text-muted-foreground">
                  {c.instructorName ?? "—"}
                </td>
                <td className="p-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="p-3">{c.enrolledCount ?? 0}</td>
                <td className="p-3">
                  <AmountDisplay amount={c.price} />
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {c.status === "review" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600"
                          onClick={() => approve.mutate(c.id)}
                          disabled={approve.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => reject.mutate(c.id)}
                          disabled={reject.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate({ to: `/lms-admin/enrollments?courseId=${c.id}` })}
                    >
                      Enrollments
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
