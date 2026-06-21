# Phase 9 — Analytics

---

## 9.1 Analytics Routes

```
GET    /lms/admin/analytics/overview          enrollment:manage
GET    /lms/admin/analytics/courses           enrollment:manage
GET    /lms/admin/analytics/revenue           enrollment:manage
GET    /lms/instructor/analytics/courses/:id  course:read (own)
GET    /lms/instructor/analytics/overview     course:read (own)
GET    /lms/learner/analytics                 learner (own)
```

---

## 9.2 Platform Overview (Admin)

`GET /lms/admin/analytics/overview`

Query: `?dateFrom=&dateTo=`

```typescript
{
  enrollments: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    periodNew: number;     // enrolled in date range
    completionRate: number; // completed / (active + completed)
  };
  courses: {
    total: number;
    published: number;
    underReview: number;
    avgRating: number;
  };
  revenue: {
    total: number;
    recognized: number;    // deferred revenue recognized
    deferred: number;
    periodRevenue: number;
    avgOrderValue: number;
  };
  topCourses: {
    courseId: string;
    title: string;
    enrollments: number;
    completionRate: number;
    revenue: number;
    rating: number;
  }[];
  enrollmentsByDay: { date: string; count: number }[];  // for chart
}
```

---

## 9.3 Course Analytics (Instructor View)

`GET /lms/instructor/analytics/courses/:id`

```typescript
{
  course: { id, title, status, publishedAt };
  enrollments: {
    total: number;
    active: number;
    completed: number;
    dropped: number;      // cancelled + expired
    completionRate: number;
    avgCompletionPct: number;
  };
  revenue: {
    total: number;
    periodRevenue: number;
  };
  modules: {
    moduleId: string;
    title: string;
    type: string;
    completionRate: number;    // completed / enrolled
    avgTimeSpentMin: number;
    avgQuizScore?: number;
    dropoffRate: number;       // started but never completed / enrolled
  }[];
  reviews: {
    avgRating: number;
    count: number;
    distribution: Record<string, number>;   // { "1": 2, "2": 5, ... "5": 38 }
    recent: { rating, comment, createdAt }[];
  };
  engagementByDay: { date: string; activeEnrollments: number }[];
}
```

**Dropoff rate per module** identifies where learners stop progressing.

---

## 9.4 Module Completion Funnel

Computed from `lmsModuleProgress` aggregates:

```typescript
const modules = await db.query.lmsCourseModules.findMany({
  where: and(eq(lmsCourseModules.courseId, courseId), eq(lmsCourseModules.isPublished, true)),
  orderBy: [asc(lmsCourseModules.sortOrder)],
});

const totalEnrolled = await getActiveEnrollmentCount(courseId);

const funnel = await Promise.all(modules.map(async (m) => {
  const started = await db.select({ count: count() }).from(lmsModuleProgress).where(
    and(eq(lmsModuleProgress.moduleId, m.id), inArray(lmsModuleProgress.status, ["in-progress", "completed"]))
  );
  const completed = await db.select({ count: count() }).from(lmsModuleProgress).where(
    and(eq(lmsModuleProgress.moduleId, m.id), eq(lmsModuleProgress.status, "completed"))
  );
  return {
    moduleId: m.id,
    title: m.title,
    startedPct: Math.round((started[0].count / totalEnrolled) * 100),
    completedPct: Math.round((completed[0].count / totalEnrolled) * 100),
  };
}));
```

---

## 9.5 Revenue Analytics

`GET /lms/admin/analytics/revenue`

Query: `?dateFrom=&dateTo=&granularity=day|week|month`

```typescript
{
  byPeriod: { period: string; gross: number; refunds: number; net: number }[];
  byCourse: {
    courseId: string;
    title: string;
    enrollments: number;
    gross: number;
    refunds: number;
    net: number;
  }[];
  byCoupon: {
    code: string;
    usedCount: number;
    discountTotal: number;
  }[];
  paymentMethods: { method: string; count: number; total: number }[];
}
```

---

## 9.6 Learner Progress Summary

`GET /lms/learner/analytics`

```typescript
{
  enrollments: {
    total: number;
    active: number;
    completed: number;
  };
  totalHoursSpent: number;
  certificates: number;
  streak: {
    current: number;     // consecutive days with activity
    longest: number;
  };
  courseSummaries: {
    courseId: string;
    title: string;
    completionPct: number;
    lastAccessedAt: string;
    status: string;
    timeSpentMinutes: number;
  }[];
}
```

Streak computed from `lmsModuleProgress.completedAt` + `lmsEnrollments.lastAccessedAt` — count consecutive calendar days with any activity.
