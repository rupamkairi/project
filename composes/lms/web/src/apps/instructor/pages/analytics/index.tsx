import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lmsApi } from "../../../../api/lms-client";
import { StatCard } from "../../../../components/shared/StatCard";
import { Card, CardHeader, CardTitle, CardContent, Progress } from "@projectx/ui";

export function CourseAnalyticsPage() {
  const { id } = useParams({ from: "/lms/teach/courses/$id/analytics" });

  const { data } = useQuery({
    queryKey: ["course-analytics", id],
    queryFn: () => lmsApi.get<any>(`/instructor/analytics/courses/${id}`),
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Course Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Performance metrics
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Enrolled" value={data?.enrollments?.total ?? 0} />
        <StatCard label="Completed" value={data?.enrollments?.completed ?? 0} />
        <StatCard label="Avg Score" value={`${data?.enrollments?.avgCompletionPct ?? 0}%`} />
        <StatCard label="Rating" value={`★ ${data?.reviews?.avgRating ?? "—"}`} />
      </div>

      {data?.modules && data.modules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Module Completion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.modules.map((m: any) => (
                <div key={m.moduleId} className="flex items-center gap-3">
                  <span className="text-sm w-48 truncate">{m.title}</span>
                  <Progress value={m.completionRate} className="flex-1" />
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {m.completionRate}%
                  </span>
                  {m.dropoffRate > 30 && (
                    <span className="text-xs text-red-500">High dropoff</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
