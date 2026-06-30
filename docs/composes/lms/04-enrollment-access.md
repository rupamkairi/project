# Phase 4 — Enrollment & Access

---

## 4.1 Enrollment Routes

```
POST   /lms/enrollments                        learner (authenticated)
GET    /lms/enrollments                        enrollment:read (own)
GET    /lms/enrollments/:id                    enrollment:read (own)
POST   /lms/enrollments/:id/cancel             learner (own)
POST   /lms/enrollments/:id/payment-webhook    internal (payment module)
GET    /lms/admin/enrollments                  enrollment:manage
PATCH  /lms/admin/enrollments/:id              enrollment:manage
```

---

## 4.2 Enroll Learner

`POST /lms/enrollments`

Body:
```typescript
{
  courseId: string;      // cat_items.id (type=course)
  cohortId?: string;     // lms_cohorts.id
  couponCode?: string;
  paymentMethodId?: string;  // required for paid courses
}
```

Enrollment is created via:
```typescript
await mediator.dispatch({
  type: "commerce.createTransaction",
  orgId: actor.orgId, actorId: actor.id,
  payload: {
    type: "order",
    personId: actor.personId,    // persons.id of the student
    lines: [{ itemId: courseId, qty: 1 }],
    stageId: enrolledStageId,    // from lms.enrollment pipeline
    meta: { cohortId, couponCode },
  }
})
```

**Duplicate guard** (most common bug — must be atomic):
```typescript
// Run inside DB transaction — check transactions table
const existing = await db.query.transactions.findFirst({
  where: and(
    eq(transactions.personId, actor.personId),
    // check transaction_lines for courseId
    notInArray(transactions.stageId, [droppedStageId, cancelledStageId])
  ),
});
if (existing) throw new ConflictError("ALREADY_ENROLLED", "Learner already enrolled in this course");
```

**Coupon validation:**
```typescript
async function validateCoupon(code: string, courseId: string, orgId: string) {
  const coupon = await db.query.lmsCoupons.findFirst({
    where: and(eq(lmsCoupons.code, code.toUpperCase()), eq(lmsCoupons.orgId, orgId), eq(lmsCoupons.isActive, true))
  });
  if (!coupon) throw new NotFoundError("COUPON_NOT_FOUND");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new ConflictError("COUPON_EXPIRED");
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new ConflictError("COUPON_EXHAUSTED");
  if (coupon.courseIds.length > 0 && !coupon.courseIds.includes(courseId)) {
    throw new ConflictError("COUPON_NOT_APPLICABLE");
  }
  return coupon;
}
```

**Price computation:**
```typescript
let finalPrice = parseFloat(course.price);
if (coupon) {
  const discount = coupon.type === "percentage"
    ? finalPrice * (parseFloat(coupon.value) / 100)
    : parseFloat(coupon.value);
  finalPrice = Math.max(0, finalPrice - discount);
}
```

**Free course bypass:**
```typescript
if (finalPrice === 0) {
  // Straight to In Progress stage — skip payment gate
  await mediator.dispatch({
    type: "commerce.createTransaction",
    orgId: actor.orgId, actorId: actor.id,
    payload: {
      type: "order",
      personId: actor.personId,
      lines: [{ itemId: courseId, qty: 1 }],
      stageId: inProgressStageId,   // lms.enrollment pipeline "In Progress" stage
      meta: { cohortId, couponCode },
    }
  })
  bus.emit("lms.enrollment.activated", { transactionId, personId: actor.personId, itemId: courseId });
  return transaction;
}
```

**Paid course flow:**
1. Insert enrollment with `status = 'pending-payment'`
2. `mediator.dispatch({ type: "payment.createIntent", amount: finalPrice, currency, metadata: { enrollmentId } })`
3. Return `{ enrollmentId, paymentClientSecret }` — client completes payment on frontend
4. Payment module calls back via `POST /lms/enrollments/:id/payment-webhook`

---

## 4.3 Payment Webhook Handler

`POST /lms/enrollments/:id/payment-webhook`

Body: `{ status: "succeeded" | "failed"; paymentId: string; amount: number }`

On `succeeded`:
1. Status → `active`
2. `paymentId` saved
3. `pricePaid` saved
4. `course.enrolledCount += 1`
5. If coupon used: `coupon.usedCount += 1`
6. Emit `lms.enrollment.activated`
7. Notify learner: "You're enrolled!"
8. Recognize deferred revenue: `mediator.dispatch({ type: "accounting.deferRevenue", ... })`

On `failed`:
1. Status → `cancelled`
2. Emit `lms.enrollment.payment-failed`
3. Notify learner: payment failed message

---

## 4.4 Enrollment FSM

```
pending-payment ──[payment.succeeded]──► active
  entry: enrolledCount+1, notify learner, defer revenue

active ──[enrollment.complete]──► completed
  guard: completionPct >= course.completionThreshold
  entry: issue certificate (if template exists), completedCount+1, recognize remaining revenue

active ──[enrollment.expire]──► expired
  guard: expiresAt < now (cron-driven)

active ──[enrollment.cancel]──► cancelled
  guard: within refundWindowDays OR role = lms-admin
  entry: create refund if pricePaid > 0

cancelled ──[refund.processed]──► refunded

pending-payment ──[payment.failed]──► cancelled
```

---

## 4.5 Access Control on Lesson Content

Before returning lesson content:

```typescript
async function assertLessonAccess(personId: string, lessonId: string, courseItemId: string): Promise<void> {
  const lesson = await db.query.lmsLessons.findFirst({ where: eq(lmsLessons.id, lessonId) });
  if (!lesson) throw new NotFoundError("LESSON_NOT_FOUND");

  // Free preview lessons — always accessible
  if (lesson.isFree) return;

  // Must have an active enrollment transaction for this course
  const enrollment = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.personId, personId),
      // joined to transaction_lines where itemId = courseItemId
      notInArray(transactions.stageId, [droppedStageId, cancelledStageId])
    ),
  });
  if (!enrollment) throw new ForbiddenError("NOT_ENROLLED");

  // Sequential unlock check: previous lesson in same module must be completed
  const lessons = await db.query.lmsLessons.findMany({
    where: eq(lmsLessons.moduleId, lesson.moduleId),
    orderBy: [asc(lmsLessons.position)],
  });
  const lessonIndex = lessons.findIndex((l) => l.id === lessonId);
  if (lessonIndex > 0) {
    const prevLesson = lessons[lessonIndex - 1];
    const prevProgress = await db.query.lmsProgress.findFirst({
      where: and(
        eq(lmsProgress.personId, personId),
        eq(lmsProgress.lessonId, prevLesson.id),
        isNotNull(lmsProgress.completedAt)
      ),
    });
    if (!prevProgress) throw new ForbiddenError("PREVIOUS_LESSON_INCOMPLETE");
  }
}
```

---

## 4.6 Waitlist Routes

```
POST   /lms/cohorts/:id/waitlist        learner
DELETE /lms/cohorts/:id/waitlist        learner (own)
GET    /lms/admin/cohorts/:id/waitlist  enrollment:manage
POST   /lms/admin/cohorts/:id/waitlist/notify-next  enrollment:manage
```

**Notify next**: picks first `waiting` entry in order, sets `status = 'notified'`, `notifiedAt = now()`. Sends notification to learner. Learner has 24h to enroll before slot re-opens.

---

## 4.7 Admin Bulk Enrollment

`POST /lms/admin/enrollments/bulk`

Body: `{ courseId: string; learnerIds: string[]; pricePaid?: number; cohortId?: string }`

Inserts enrollments directly as `active` (bypasses payment). Max 500 per request.
Useful for corporate batch enrollment or instructor comps.

Returns: `{ enrolled: number; skipped: number; errors: { learnerId, reason }[] }`
