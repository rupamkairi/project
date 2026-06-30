import { useQuery } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { StatCard } from "../../../../components/shared/StatCard"
import { AmountDisplay } from "../../../../components/shared/PriceDisplay"
import { Button } from "@projectx/ui"
import { useNavigate } from "@tanstack/react-router"

export function InstructorAnalyticsOverviewPage() {
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ["instructor-overview"],
    queryFn: () => lmsApi.get<any>("/instructor/analytics/overview"),
  })

  const courses = data?.courses ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview across all your courses
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Students" value={data?.totalStudents ?? 0} />
        <StatCard
          label="Avg Rating"
          value={`★ ${data?.avgRating?.toFixed(1) ?? "—"}`}
        />
        <StatCard
          label="Revenue (MTD)"
          value={<AmountDisplay amount={data?.mtdRevenue} />}
        />
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">Course</th>
              <th className="text-left p-3 font-medium">Enrolled</th>
              <th className="text-left p-3 font-medium">Completion</th>
              <th className="text-left p-3 font-medium">Rating</th>
              <th className="text-left p-3 font-medium">Revenue</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {courses.map((c: any) => (
              <tr key={c.courseId} className="border-t hover:bg-muted/30">
                <td className="p-3">{c.title}</td>
                <td className="p-3">{c.enrollments ?? 0}</td>
                <td className="p-3">{c.completionRate ?? 0}%</td>
                <td className="p-3">★ {c.rating?.toFixed(1) ?? "—"}</td>
                <td className="p-3">
                  <AmountDisplay amount={c.revenue} />
                </td>
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate({ to: `/teach/courses/${c.courseId}/analytics` })
                    }
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
