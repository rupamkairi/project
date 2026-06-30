# Phase 16 — Web: Course Detail & Enrollment

---

## 16.1 Public Course Detail Page

Route: `/learn/courses/:slug`

```tsx
export function CourseDetailPage() {
  const { slug } = useParams();
  const { data: course } = useQuery({ queryKey: ["course", slug], queryFn: () => lmsApi.get(`/courses/${slug}`) });
  const { data: enrollment } = useEnrollmentForCourse(course?.id);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero */}
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4">
          <h1 className="text-3xl font-bold">{course?.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>★ {course?.rating} ({course?.reviewCount} reviews)</span>
            <span>{course?.enrolledCount} enrolled</span>
            <span className="capitalize">{course?.level}</span>
            <span>{course?.language?.toUpperCase()}</span>
          </div>
          <p>{course?.description}</p>
        </div>

        {/* Enroll card */}
        <EnrollCard course={course} enrollment={enrollment} />
      </div>

      {/* Modules (free previews accessible, rest locked) */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Course Content</h2>
        <div className="space-y-2">
          {course?.modules.map(m => (
            <ModuleRow key={m.id} module={m} isLocked={!m.isFree && !enrollment} />
          ))}
        </div>
      </section>

      {/* Reviews */}
      <ReviewsSection courseId={course?.id} />
    </div>
  );
}
```

---

## 16.2 Enroll Card Component

```tsx
function EnrollCard({ course, enrollment }) {
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<CouponResult | null>(null);
  const enroll = useMutation({ mutationFn: (data) => lmsApi.post("/enrollments", data) });

  const effectivePrice = couponApplied
    ? couponApplied.finalPrice
    : parseFloat(course?.price ?? "0");

  if (enrollment?.status === "active") {
    return (
      <Card className="p-4 space-y-3">
        <p className="text-green-600 font-medium">You are enrolled</p>
        <Progress value={enrollment.completionPct} />
        <p className="text-sm text-muted-foreground">{enrollment.completionPct}% complete</p>
        <Button className="w-full" onClick={() => navigate(`/learn/courses/${course.slug}/continue`)}>
          Continue Learning
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="text-2xl font-bold">
        {effectivePrice === 0 ? "Free" : <AmountDisplay amount={effectivePrice} currency={course?.currency} />}
      </div>
      {course?.compareAtPrice && parseFloat(course.compareAtPrice) > effectivePrice && (
        <p className="text-sm text-muted-foreground line-through"><AmountDisplay amount={course.compareAtPrice} /></p>
      )}

      <CouponInput value={coupon} onChange={setCoupon} courseId={course?.id}
        onApply={result => setCouponApplied(result)} />

      <Button className="w-full" disabled={enroll.isPending}
        onClick={() => enroll.mutateAsync({ courseId: course.id, couponCode: coupon || undefined })}>
        {effectivePrice === 0 ? "Enroll Free" : "Enroll Now"}
      </Button>

      <ul className="text-xs text-muted-foreground space-y-1">
        <li>✓ {course?.moduleCount} modules</li>
        <li>✓ {course?.durationHours}h total</li>
        {course?.certificateTemplate && <li>✓ Certificate on completion</li>}
      </ul>
    </Card>
  );
}
```

---

## 16.3 Continue Learning Redirect

Route: `/learn/courses/:slug/continue`

Redirects to the first incomplete module for the learner's enrollment:

```typescript
export async function continueLearnRedirect(slug: string, enrollmentId: string) {
  const progress = await lmsApi.get(`/enrollments/${enrollmentId}/progress`);
  const firstIncomplete = progress.modules.find(m => m.status !== "completed");
  if (firstIncomplete) {
    navigate(`/learn/courses/${slug}/modules/${firstIncomplete.moduleId}`);
  } else {
    navigate(`/learn/courses/${slug}`);
  }
}
```

---

## 16.4 Reviews Section

```tsx
function ReviewsSection({ courseId }) {
  const { data } = useQuery({ queryKey: ["reviews", courseId], queryFn: () => lmsApi.get(`/courses/${courseId}/reviews`) });

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Student Reviews</h2>

      {/* Rating distribution */}
      <div className="flex gap-6 mb-6">
        <div className="text-center">
          <p className="text-4xl font-bold">{data?.avgRating.toFixed(1)}</p>
          <StarRating value={data?.avgRating} />
        </div>
        <div className="flex-1 space-y-1">
          {[5,4,3,2,1].map(stars => (
            <div key={stars} className="flex items-center gap-2">
              <span className="text-xs w-4">{stars}</span>
              <Progress value={(data?.distribution[stars] / data?.total) * 100} className="flex-1" />
              <span className="text-xs text-muted-foreground w-8">{data?.distribution[stars]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-4">
        {data?.reviews.slice(0, 5).map(r => (
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
  );
}
```

---

## 16.5 Module Row Component

```tsx
function ModuleRow({ module, isLocked }) {
  const typeIcon = {
    video: "▶",
    article: "📄",
    quiz: "✏",
    assignment: "📋",
    "live-session": "🎥",
    download: "⬇",
  }[module.type];

  return (
    <div className={cn("flex items-center gap-3 p-3 rounded border", isLocked && "opacity-60")}>
      <span className="text-sm w-6">{typeIcon}</span>
      <span className="flex-1 text-sm">{module.title}</span>
      <span className="text-xs text-muted-foreground">{module.estimatedMinutes}min</span>
      {module.isFree && <Badge variant="outline" className="text-xs">Free</Badge>}
      {isLocked && <span className="text-xs text-muted-foreground">🔒</span>}
    </div>
  );
}
```
