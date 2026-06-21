# Phase 22 — Missed Integrations & Critical Pitfalls

This is a checklist of behaviors that are easy to miss during implementation and cause silent data bugs or broken flows.

---

## 22.1 Enrollment: Free Course Bypass

**Pitfall:** Paid flow runs for `price = 0.00` courses, creating orphaned payment intents.

**Guard:**
```typescript
if (parseFloat(finalPrice) === 0) {
  // Skip payment intent entirely
  await activateEnrollment(enrollmentId, db);
  return enrollment;
}
// Only reach here for paid courses
const intent = await stripe.paymentIntents.create({ ... });
```

**Where:** `POST /lms/enrollments` (enrollment create handler).

---

## 22.2 Enrollment: Duplicate Guard

**Pitfall:** Race condition — two requests simultaneously create duplicate active enrollments.

**Guard:**
```typescript
await db.transaction(async (tx) => {
  const existing = await tx.select()
    .from(lmsEnrollments)
    .where(and(
      eq(lmsEnrollments.learnerId, learnerId),
      eq(lmsEnrollments.courseId, courseId),
      notInArray(lmsEnrollments.status, ["cancelled", "refunded"]),
    ))
    .for("update")  // row-level lock
    .limit(1);

  if (existing.length > 0) throw new ConflictError("ALREADY_ENROLLED");
  // Insert enrollment inside same transaction
});
```

---

## 22.3 Quiz Attempts: Server-Side Max Enforcement

**Pitfall:** Frontend disables submit button but backend never checks — users can bypass via direct API.

**Guard at submission create:**
```typescript
const attempts = await db.select({ count: sql<number>`count(*)` })
  .from(lmsQuizSubmissions)
  .where(and(
    eq(lmsQuizSubmissions.enrollmentId, enrollmentId),
    eq(lmsQuizSubmissions.moduleId, moduleId),
  ));

if (attempts[0].count >= orgConfig.maxQuizAttempts) {
  throw new ForbiddenError("MAX_QUIZ_ATTEMPTS_REACHED");
}
```

---

## 22.4 Certificate: Threshold Check Before Issue

**Pitfall:** Certificate issued for partially-complete enrollment.

**Guard in `issueCertificate()`:**
```typescript
const enrollment = await getEnrollment(enrollmentId);
const course = await getCourse(enrollment.courseId);

if (enrollment.completionPct < course.completionThreshold) {
  throw new ForbiddenError("COMPLETION_THRESHOLD_NOT_MET");
}
```

**Also:** Double-issue guard via unique constraint on `(enrollmentId, templateId)` in `lms_certificates`.

---

## 22.5 Video Heartbeat: In-Memory Debounce

**Pitfall:** Every heartbeat hits the DB → thousands of writes per hour per active learner.

**Pattern:**
```typescript
const heartbeatDebounce = new Map<string, NodeJS.Timeout>();

function scheduleHeartbeatWrite(enrollmentId: string, moduleId: string, position: number) {
  const key = `${enrollmentId}:${moduleId}`;
  const existing = heartbeatDebounce.get(key);
  if (existing) clearTimeout(existing);

  heartbeatDebounce.set(key, setTimeout(async () => {
    await db.update(lmsModuleProgress)
      .set({ lastPosition: position, updatedAt: new Date() })
      .where(and(eq(...enrollmentId), eq(...moduleId)));
    heartbeatDebounce.delete(key);
  }, 10_000));  // 10s debounce
}
```

Max 1 DB write per 10s per `enrollmentId:moduleId` key.

---

## 22.6 Sequential Module Unlock

**Pitfall:** Learner accesses Module 3 without completing Module 2.

**Guard in `assertModuleAccess()`:**
```typescript
if (module.requiredPrevious) {
  const prevProgress = await db.select()
    .from(lmsModuleProgress)
    .where(and(
      eq(lmsModuleProgress.enrollmentId, enrollmentId),
      eq(lmsModuleProgress.moduleId, module.previousModuleId!),
    )).limit(1);

  if (!prevProgress[0]?.completedAt) {
    throw new ForbiddenError("PREVIOUS_MODULE_NOT_COMPLETED");
  }
}
```

---

## 22.7 Deferred Revenue Recognition

**Pitfall:** Full course revenue recognized at enrollment rather than earned proportionally.

**Pattern — recognize per module completion:**
```typescript
// In module.completed hook:
const course = await getCourse(courseId);
const earnedFraction = 1 / course.totalModules;
const revenueIncrement = parseFloat(enrollment.paidAmount) * earnedFraction;

await bus.publish("revenue.recognized", {
  sourceType: "lms_enrollment",
  sourceId: enrollment.id,
  amount: revenueIncrement,
  recognizedAt: new Date(),
});
```

---

## 22.8 Coupon: Atomic Decrement

**Pitfall:** Two enrollments simultaneously apply same coupon → `usedCount` goes from 49 to 51 (overshoots `maxUses = 50`).

**Guard:**
```typescript
const result = await db.update(lmsCoupons)
  .set({ usedCount: sql`${lmsCoupons.usedCount} + 1` })
  .where(and(
    eq(lmsCoupons.code, couponCode),
    eq(lmsCoupons.isActive, true),
    sql`${lmsCoupons.usedCount} < ${lmsCoupons.maxUses}`,
  ))
  .returning();

if (result.length === 0) throw new ConflictError("COUPON_EXHAUSTED");
```

---

## 22.9 Cohort Cancellation: Batch Enrollment Cancel

**Pitfall:** Cohort cancelled but enrolled learners remain `active` → they still see cohort in UI.

**Hook: `lms.cohort.cancelled` → batch update enrollments:**
```typescript
bus.on("lms.cohort.cancelled", async ({ cohortId }) => {
  await db.update(lmsEnrollments)
    .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: "cohort_cancelled" })
    .where(and(
      eq(lmsEnrollments.cohortId, cohortId),
      inArray(lmsEnrollments.status, ["active", "pending-payment"]),
    ));
});
```

---

## 22.10 Module Completion: Recompute completionPct

**Pitfall:** `completionPct` computed client-side or not updated → `issueCertificate` check fails on completed courses.

**Pattern — recompute server-side on every module completion:**
```typescript
const completedCount = await db.select({ count: sql<number>`count(*)` })
  .from(lmsModuleProgress)
  .where(and(
    eq(lmsModuleProgress.enrollmentId, enrollmentId),
    isNotNull(lmsModuleProgress.completedAt),
  ));

const newPct = Math.floor((completedCount[0].count / course.totalModules) * 100);
await db.update(lmsEnrollments).set({ completionPct: newPct }).where(eq(lmsEnrollments.id, enrollmentId));

if (newPct >= course.completionThreshold) {
  await bus.publish("lms.enrollment.completed", { enrollmentId });
}
```

---

## 22.11 Certificate Verification Code

**Pattern:**
```typescript
import { createId } from "@paralleldrive/cuid2";

const verificationCode = `LMS-${createId().slice(-8).toUpperCase()}`;
```

Must be unique. Add `UNIQUE` constraint on `lms_certificates.verification_code`.

---

## 22.12 Waitlist: Expiry

**Pitfall:** Learner sits on waitlist forever after spot opens but doesn't act.

**Job: every 30min:**
```typescript
await db.update(lmsWaitlist)
  .set({ status: "expired" })
  .where(and(
    eq(lmsWaitlist.status, "notified"),
    lt(lmsWaitlist.notifiedAt, sql`now() - interval '48 hours'`),
  ));
```

---

## 22.13 Stripe Webhook: Idempotency

**Pitfall:** Stripe retries webhooks → enrollment activated twice → duplicate module progress rows.

**Guard:**
```typescript
const existingEvent = await db.select()
  .from(lmsPaymentEvents)
  .where(eq(lmsPaymentEvents.stripeEventId, event.id))
  .limit(1);

if (existingEvent.length > 0) {
  return { received: true };  // Already processed
}
// Process + insert event record in same transaction
```

---

## 22.14 Checklist Before Going Live

- [ ] `LMS_VIDEO_CDN_BASE_URL` set in server env
- [ ] `STRIPE_WEBHOOK_SECRET` configured, webhook endpoint registered in Stripe dashboard
- [ ] `maxQuizAttempts` set in `lms_org_config` (default 3)
- [ ] `completionThreshold` set per course (default 80)
- [ ] Free courses (`price = 0`) tested end-to-end without Stripe
- [ ] Video heartbeat debounce verified (no DB writes within 10s window)
- [ ] Certificate PDF generation tested (template vars render correctly)
- [ ] Public `/lms/certificates/verify/:code` endpoint accessible without auth
- [ ] Coupon `UNIQUE` constraint on `code` column
- [ ] `lms_certificates` unique constraint on `(enrollment_id, template_id)`
