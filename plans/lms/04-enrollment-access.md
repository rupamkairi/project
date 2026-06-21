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
  courseId: string;
  cohortId?: string;
  couponCode?: string;
  paymentMethodId?: string;  // required for paid courses
}
```

**Duplicate guard** (most common bug — must be atomic):
```typescript
// Run inside DB transaction
const existing = await db.query.lmsEnrollments.findFirst({
  where: and(
    eq(lmsEnrollments.learnerId, learnerId),
    eq(lmsEnrollments.courseId, courseId),
    notInArray(lmsEnrollments.status, ["cancelled", "refunded"])
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
  // Straight to active — skip payment gate entirely
  await db.insert(lmsEnrollments).values({
    ...enrollmentData,
    status: "active",
    pricePaid: "0",
  });
  await db.update(lmsCourses).set({ enrolledCount: sql`enrolled_count + 1` }).where(eq(lmsCourses.id, courseId));
  bus.emit("lms.enrollment.activated", { enrollmentId, learnerId, courseId });
  return enrollment;
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

## 4.5 Access Control on Module Content

Before returning module content:

```typescript
async function assertModuleAccess(learnerId: string, moduleId: string, courseId: string): Promise<void> {
  const module = await db.query.lmsCourseModules.findFirst({ where: eq(lmsCourseModules.id, moduleId) });
  if (!module) throw new NotFoundError("MODULE_NOT_FOUND");

  // Free preview modules — always accessible
  if (module.isFree) return;

  // Must have active enrollment
  const enrollment = await db.query.lmsEnrollments.findFirst({
    where: and(
      eq(lmsEnrollments.learnerId, learnerId),
      eq(lmsEnrollments.courseId, courseId),
      eq(lmsEnrollments.status, "active")
    ),
  });
  if (!enrollment) throw new ForbiddenError("NOT_ENROLLED");

  // Sequential unlock check
  if (module.requiredPrevious) {
    const modules = await db.query.lmsCourseModules.findMany({
      where: eq(lmsCourseModules.courseId, courseId),
      orderBy: [asc(lmsCourseModules.sortOrder)],
    });
    const moduleIndex = modules.findIndex((m) => m.id === moduleId);
    if (moduleIndex > 0) {
      const prevModule = modules[moduleIndex - 1];
      const prevProgress = await db.query.lmsModuleProgress.findFirst({
        where: and(
          eq(lmsModuleProgress.enrollmentId, enrollment.id),
          eq(lmsModuleProgress.moduleId, prevModule.id),
          eq(lmsModuleProgress.status, "completed")
        ),
      });
      if (!prevProgress) throw new ForbiddenError("PREVIOUS_MODULE_INCOMPLETE");
    }
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
