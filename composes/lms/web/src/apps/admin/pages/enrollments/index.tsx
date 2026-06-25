import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { Button, Input, Label } from "@projectx/ui"
import { formatDate } from "../../../../components/shared/PriceDisplay"
import { Upload } from "lucide-react"

export function AdminEnrollmentsPage() {
  const [courseId, setCourseId] = useState("")
  const [learnerId, setLearnerId] = useState("")
  const [bulkCourseId, setBulkCourseId] = useState("")
  const [learnerIdsCsv, setLearnerIdsCsv] = useState("")

  const { data, refetch } = useQuery({
    queryKey: ["admin-enrollments", courseId],
    queryFn: () =>
      lmsApi.get<any>(
        courseId
          ? `/admin/enrollments?courseId=${courseId}`
          : "/admin/enrollments",
      ),
  })

  const enrollSingle = useMutation({
    mutationFn: () =>
      lmsApi.post("/admin/enrollments", {
        courseId,
        learnerId,
      }),
    onSuccess: () => {
      setLearnerId("")
      refetch()
    },
  })

  const bulkEnroll = useMutation({
    mutationFn: () =>
      lmsApi.post("/admin/enrollments/bulk", {
        courseId: bulkCourseId,
        learnerIds: learnerIdsCsv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      setBulkCourseId("")
      setLearnerIdsCsv("")
      refetch()
    },
  })

  const enrollments = data?.enrollments ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Enrollments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage course enrollments
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium">Single Enrollment</h3>
          <div className="space-y-1.5">
            <Label htmlFor="single-course" className="text-xs">Course ID</Label>
            <Input
              id="single-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="h-8 text-xs"
              placeholder="course-id"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="single-learner" className="text-xs">Learner ID</Label>
            <Input
              id="single-learner"
              value={learnerId}
              onChange={(e) => setLearnerId(e.target.value)}
              className="h-8 text-xs"
              placeholder="learner-id"
            />
          </div>
          <Button
            size="sm"
            onClick={() => enrollSingle.mutate()}
            disabled={enrollSingle.isPending || !courseId || !learnerId}
          >
            {enrollSingle.isPending ? "Enrolling..." : "Enroll"}
          </Button>
          {enrollSingle.isSuccess && (
            <p className="text-xs text-green-600">Enrolled successfully</p>
          )}
          {enrollSingle.isError && (
            <p className="text-xs text-red-500">
              {(enrollSingle.error as any)?.message ?? "Failed"}
            </p>
          )}
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium">Bulk Enrollment</h3>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-course" className="text-xs">Course ID</Label>
            <Input
              id="bulk-course"
              value={bulkCourseId}
              onChange={(e) => setBulkCourseId(e.target.value)}
              className="h-8 text-xs"
              placeholder="course-id"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-learners" className="text-xs">Learner IDs (comma-separated)</Label>
            <Input
              id="bulk-learners"
              value={learnerIdsCsv}
              onChange={(e) => setLearnerIdsCsv(e.target.value)}
              className="h-8 text-xs"
              placeholder="id1, id2, id3"
            />
          </div>
          <Button
            size="sm"
            onClick={() => bulkEnroll.mutate()}
            disabled={bulkEnroll.isPending || !bulkCourseId || !learnerIdsCsv}
          >
            {bulkEnroll.isPending ? (
              <>
                <Upload className="h-4 w-4 mr-1.5 animate-pulse" />
                Enrolling...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1.5" />
                Bulk Enroll
              </>
            )}
          </Button>
          {bulkEnroll.isSuccess && (
            <p className="text-xs text-green-600">Enrolled successfully</p>
          )}
          {bulkEnroll.isError && (
            <p className="text-xs text-red-500">
              {(bulkEnroll.error as any)?.message ?? "Failed"}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="p-3 border-b bg-muted/30">
          <p className="text-sm font-medium">
            Enrollment History ({enrollments.length})
          </p>
        </div>
        {enrollments.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Learner</th>
                <th className="text-left p-3 font-medium">Course</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Progress</th>
                <th className="text-left p-3 font-medium">Enrolled At</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e: any) => (
                <tr key={e.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">{e.learnerName ?? e.learnerId}</td>
                  <td className="p-3 text-muted-foreground">
                    {e.courseTitle ?? e.courseId}
                  </td>
                  <td className="p-3">{e.status ?? "active"}</td>
                  <td className="p-3">
                    {e.progress != null ? `${Math.round(e.progress * 100)}%` : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {formatDate(e.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-sm text-muted-foreground text-center">
            No enrollments found
          </p>
        )}
      </div>
    </div>
  )
}
