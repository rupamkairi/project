import { useQuery } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { StatCard } from "../../../../components/shared/StatCard"
import { AmountDisplay } from "../../../../components/shared/PriceDisplay"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@projectx/ui"

export function LmsAdminDashboard() {
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => lmsApi.get<any>("/admin/analytics/overview"),
  })

  const topCourses = data?.topCourses ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">LMS Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform-wide overview
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Courses" value={data?.totalCourses ?? 0} />
        <StatCard label="Total Enrollments" value={data?.totalEnrollments ?? 0} />
        <StatCard label="Active Students" value={data?.activeStudents ?? 0} />
        <StatCard label="Total Instructors" value={data?.totalInstructors ?? 0} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Revenue (MTD)"
          value={<AmountDisplay amount={data?.mtdRevenue} />}
        />
        <StatCard
          label="Avg Rating"
          value={`★ ${data?.avgRating?.toFixed(1) ?? "—"}`}
        />
      </div>

      <div className="rounded-md border">
        <div className="p-3 border-b bg-muted/30">
          <p className="text-sm font-medium">Top Courses</p>
        </div>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">Course</th>
              <th className="text-left p-3 font-medium">Enrolled</th>
              <th className="text-left p-3 font-medium">Rating</th>
              <th className="text-right p-3 font-medium">Revenue</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {topCourses.map((c: any) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="p-3">{c.title}</td>
                <td className="p-3">{c.enrolledCount ?? 0}</td>
                <td className="p-3">★ {c.rating?.toFixed(1) ?? "—"}</td>
                <td className="p-3 text-right">
                  <AmountDisplay amount={c.revenue} />
                </td>
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: `/lms/admin/courses` })}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
