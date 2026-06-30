import { useParams } from "@tanstack/react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { Tabs, TabsList, TabsTrigger, TabsContent, StatusBadge, Button, Spinner } from "@projectx/ui"
import { CourseDetailsForm } from "./CourseDetailsForm"
import { ModuleManager } from "./ModuleManager"
import { PricingForm } from "./PricingForm"

export function CourseEditorPage() {
  const { id } = useParams({ from: "/lms/teach/courses/$id/edit" })

  const { data: course, refetch } = useQuery({
    queryKey: ["instructor-course", id],
    queryFn: () => lmsApi.get<any>(`/instructor/courses/${id}`),
  })

  const submitForReview = useMutation({
    mutationFn: () => lmsApi.post(`/instructor/courses/${id}/submit-review`),
    onSuccess: () => refetch(),
  })

  if (!course) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{course.title ?? "Untitled Course"}</h1>
          <StatusBadge status={course.status} />
        </div>
        <div className="flex gap-2">
          {course.status === "draft" && (
            <Button
              onClick={() => submitForReview.mutate()}
              disabled={submitForReview.isPending}
            >
              {submitForReview.isPending ? "Submitting..." : "Submit for Review"}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="modules">
            Modules ({course.moduleCount ?? course.modules?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <CourseDetailsForm course={course} courseId={id} onUpdate={() => refetch()} />
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <ModuleManager courseId={id} />
        </TabsContent>

        <TabsContent value="pricing" className="mt-4">
          <PricingForm course={course} courseId={id} />
        </TabsContent>

        <TabsContent value="cohorts" className="mt-4">
          <p className="text-sm text-muted-foreground py-4">
            Cohort management will be available in a future update.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
