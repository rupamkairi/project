import { useQuery } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { StatCard } from "../../../../components/shared/StatCard"
import { ProgressBar } from "../../../../components/shared/ProgressBar"
import { CourseCard } from "../../../../components/shared/CourseCard"
import { formatDate } from "../../../../components/shared/PriceDisplay"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@projectx/ui"

export function LearnerDashboard() {
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ["learner-dashboard"],
    queryFn: () => lmsApi.get<any>("/enrollments"),
  })

  const enrollments = data?.enrollments ?? []

  const inProgress = enrollments.filter((e: any) => {
    const p = e.progress ?? 0
    return p > 0 && p < 1
  })
  const completed = enrollments.filter(
    (e: any) => (e.progress ?? 0) >= 1 && e.status !== "dropped",
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My Learning</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Continue where you left off
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="In Progress" value={inProgress.length} />
        <StatCard label="Completed" value={completed.length} />
        <StatCard label="Total Enrolled" value={enrollments.length} />
      </div>

      {inProgress.length > 0 && (
        <section>
          <h2 className="text-sm font-medium mb-3">Continue Learning</h2>
          <div className="grid grid-cols-3 gap-4">
            {inProgress.slice(0, 6).map((e: any) => (
              <div
                key={e.id}
                className="border rounded-lg p-4 space-y-2 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() =>
                  navigate({
                    to: `/learn/courses/${e.courseSlug ?? e.courseId}`,
                  })
                }
              >
                <p className="text-sm font-medium truncate">
                  {e.courseTitle ?? "Course"}
                </p>
                <ProgressBar
                  value={((e.progress ?? 0) * 100).toFixed(0) as any}
                />
                <p className="text-xs text-muted-foreground">
                  {Math.round((e.progress ?? 0) * 100)}% complete
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="text-sm font-medium mb-3">Completed Courses</h2>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left p-3 font-medium">Course</th>
                  <th className="text-left p-3 font-medium">Completed</th>
                  <th className="text-left p-3 font-medium">Certificate</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {completed.map((e: any) => (
                  <tr key={e.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{e.courseTitle}</td>
                    <td className="p-3 text-muted-foreground">
                      {formatDate(e.completedAt)}
                    </td>
                    <td className="p-3">
                      {e.certificateUrl ? (
                        <a
                          href={e.certificateUrl}
                          target="_blank"
                          className="text-primary hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate({
                            to: `/learn/courses/${e.courseSlug ?? e.courseId}`,
                          })
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
        </section>
      )}

      {enrollments.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            You haven't enrolled in any courses yet
          </p>
          <Button onClick={() => navigate({ to: "/learn/catalog" })}>
            Browse Catalog
          </Button>
        </div>
      )}
    </div>
  )
}
