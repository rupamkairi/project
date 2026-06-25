import { useQuery } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { StatCard } from "../../../../components/shared/StatCard"
import { AmountDisplay } from "../../../../components/shared/PriceDisplay"
import { useNavigate } from "@tanstack/react-router"
import { Button, StatusBadge } from "@projectx/ui"

export function InstructorDashboard() {
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ["instructor-overview"],
    queryFn: () => lmsApi.get<any>("/instructor/analytics/overview"),
  })

  const { data: coursesData } = useQuery({
    queryKey: ["instructor-courses"],
    queryFn: () => lmsApi.get<any>("/instructor/courses"),
  })

  const courses = coursesData?.courses ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Instructor Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Courses" value={data?.totalCourses ?? courses.length} />
        <StatCard label="Total Students" value={data?.totalStudents ?? 0} />
        <StatCard label="Avg Rating" value={`★ ${data?.avgRating?.toFixed(1) ?? "—"}`} />
        <StatCard
          label="Revenue (MTD)"
          value={<AmountDisplay amount={data?.mtdRevenue} />}
        />
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="p-3 border-b bg-muted/30 flex justify-between items-center">
          <p className="text-sm font-medium">Your Courses</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/teach/analytics" })}
            >
              View Analytics
            </Button>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/teach/courses/new" })}
            >
              New Course
            </Button>
          </div>
        </div>
        {courses.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Enrolled</th>
                <th className="text-left p-3 font-medium">Rating</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {courses.slice(0, 5).map((c: any) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.title}</td>
                  <td className="p-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="p-3">{c.enrolledCount ?? 0}</td>
                  <td className="p-3">
                    {c.rating ? `★ ${c.rating.toFixed(1)}` : "—"}
                  </td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate({ to: `/teach/courses/${c.id}/edit` })
                      }
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-sm text-muted-foreground text-center">
            No courses yet.{" "}
            <button
              onClick={() => navigate({ to: "/teach/courses/new" })}
              className="text-primary hover:underline"
            >
              Create your first course
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
