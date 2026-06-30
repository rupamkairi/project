import { useState } from "react"
import { useParams, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { Button, Card, CardContent, Input, Badge, Progress, cn, Spinner } from "@projectx/ui"
import { StarRating } from "../../../../components/shared/StarRating"
import { PriceDisplay, formatDate } from "../../../../components/shared/PriceDisplay"
import { ModuleIcon } from "../../../../components/shared/ModuleIcon"

function EnrollCard({ course }: { course: any }) {
  const navigate = useNavigate()
  const [coupon, setCoupon] = useState("")

  const enroll = useMutation({
    mutationFn: () =>
      lmsApi.post("/enrollments", {
        courseId: course.id,
        couponCode: coupon || undefined,
      }),
  })

  const effectivePrice = parseFloat(course?.price ?? "0")

  return (
    <Card className="p-4 space-y-3 h-fit">
      <div className="text-2xl font-bold">
        {effectivePrice === 0 ? "Free" : <PriceDisplay amount={course.price} currency={course.currency} />}
      </div>
      {course.compareAtPrice && parseFloat(course.compareAtPrice) > effectivePrice && (
        <p className="text-sm text-muted-foreground line-through">
          <PriceDisplay amount={course.compareAtPrice} />
        </p>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Coupon code"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <Button
        className="w-full"
        disabled={enroll.isPending}
        onClick={() => enroll.mutateAsync()}
      >
        {enroll.isPending ? "Enrolling..." : effectivePrice === 0 ? "Enroll Free" : "Enroll Now"}
      </Button>

      {enroll.isSuccess && (
        <p className="text-sm text-green-600 font-medium">
          Enrolled!{" "}
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto"
            onClick={() => navigate({ to: `/lms/learn/courses/${course.slug}/continue` })}
          >
            Start learning
          </Button>
        </p>
      )}

      {enroll.isError && (
        <p className="text-sm text-red-500">
          {(enroll.error as any)?.message ?? "Enrollment failed"}
        </p>
      )}

      <ul className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <li>✓ {course.moduleCount ?? 0} modules</li>
        {course.durationHours && <li>✓ {course.durationHours}h total</li>}
        {course.certificateTemplate && <li>✓ Certificate on completion</li>}
      </ul>
    </Card>
  )
}

function ReviewsSection({ courseId }: { courseId: string }) {
  const { data } = useQuery({
    queryKey: ["reviews", courseId],
    queryFn: () => lmsApi.get<any>(`/courses/${courseId}/reviews`),
  })

  const total = data?.total ?? 0
  const distribution = data?.distribution ?? {}
  const avgRating = data?.avgRating ?? 0

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Student Reviews</h2>

      {total > 0 && (
        <div className="flex gap-6 mb-6">
          <div className="text-center">
            <p className="text-4xl font-bold">{avgRating.toFixed(1)}</p>
            <StarRating value={avgRating} />
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-xs w-4">{stars}</span>
                <Progress
                  value={total > 0 ? ((distribution[stars] ?? 0) / total) * 100 : 0}
                  className="flex-1 h-2"
                />
                <span className="text-xs text-muted-foreground w-8">{distribution[stars] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {(data?.reviews ?? []).slice(0, 5).map((r: any) => (
          <div key={r.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <StarRating value={r.rating} size="sm" />
              <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              {r.isVerified && <span className="text-xs text-green-600">Verified Purchase</span>}
            </div>
            <p className="text-sm">{r.comment}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ModuleRow({ module, isLocked }: { module: any; isLocked: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded border", isLocked && "opacity-60")}>
      <ModuleIcon type={module.type} className="text-sm w-6 text-center" />
      <span className="flex-1 text-sm">{module.title}</span>
      <span className="text-xs text-muted-foreground">{module.estimatedMinutes}min</span>
      {module.isFree && (
        <Badge variant="outline" className="text-xs">
          Free
        </Badge>
      )}
      {isLocked && <span className="text-xs text-muted-foreground">🔒</span>}
    </div>
  )
}

export function CourseDetailPage() {
  const { slug } = useParams({ from: "/lms/learn/courses/$slug" })

  const { data: course } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => lmsApi.get<any>(`/courses/${slug}`),
  })

  if (!course) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4">
          {course.thumbnailUrl && (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img src={course.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span>★ {course.rating?.toFixed(1)} ({course.reviewCount ?? 0} reviews)</span>
            <span>{course.enrolledCount ?? 0} enrolled</span>
            <span className="capitalize">{course.level}</span>
            <span>{course.language?.toUpperCase()}</span>
            {course.durationHours && <span>{course.durationHours}h total</span>}
          </div>
          <p className="text-sm leading-relaxed">{course.description}</p>
        </div>

        <EnrollCard course={course} />
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4">Course Content</h2>
        <div className="space-y-2">
          {(course.modules ?? []).map((m: any) => (
            <ModuleRow key={m.id} module={m} isLocked={!m.isFree} />
          ))}
        </div>
      </section>

      {course.reviews && <ReviewsSection courseId={course.id} />}
    </div>
  )
}
