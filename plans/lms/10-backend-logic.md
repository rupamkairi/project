# Phase 10 — Backend Logic (FSMs, Hooks, Jobs, Rules)

---

## 10.1 All FSMs Summary

| Entity | States |
|--------|--------|
| Course | `draft → under-review → published → archived → draft` |
| Enrollment | `pending-payment → active → completed / expired / cancelled → refunded` |
| Module Progress | `not-started → in-progress → completed` |
| Submission | `submitted / late → grading → graded / returned` |
| Cohort | `scheduled → active → completed / cancelled` |
| Live Session | `scheduled → live → ended → recorded / cancelled` |

---

## 10.2 `registerLmsHooks(bus, mediator)`

```typescript
export function registerLmsHooks(bus: EventBus, mediator: Mediator): void {

  // Enrollment activated → seed progress records
  bus.on("lms.enrollment.activated", async ({ enrollmentId, learnerId, courseId }) => {
    await seedModuleProgress(enrollmentId, courseId, learnerId);
  });

  // All module progress completed → complete enrollment
  bus.on("lms.module.completed", async ({ enrollmentId, courseId }) => {
    const enrollment = await getEnrollment(enrollmentId);
    const course = await getCourse(courseId);
    if (enrollment.completionPct >= course.completionThreshold) {
      await completeEnrollment(enrollmentId);
    }
    await unlockNextModule(enrollmentId, /* completedModuleId */ , courseId);
  });

  // Enrollment completed → issue certificate
  bus.on("lms.enrollment.completed", async ({ enrollmentId, learnerId, courseId }) => {
    await issueCertificate(enrollmentId, learnerId, courseId);
    // Recognize remaining deferred revenue
    await mediator.dispatch({ type: "accounting.recognizeAllDeferredRevenue", enrollmentId });
    // Update instructor payout if applicable
    await mediator.dispatch({ type: "payout.triggerInstructor", courseId, enrollmentId });
  });

  // Cohort cancelled → cancel all active enrollments
  bus.on("lms.cohort.cancelled", async ({ cohortId }) => {
    const enrollments = await getActiveCohortEnrollments(cohortId);
    for (const enr of enrollments) {
      await cancelEnrollment(enr.id, "Cohort cancelled");
      if (parseFloat(enr.pricePaid) > 0) {
        await mediator.dispatch({ type: "payment.refund", paymentId: enr.paymentId, amount: enr.pricePaid });
      }
    }
  });

  // Course published → notify waitlist learners (if self-paced, they can now enroll)
  bus.on("lms.course.published", async ({ courseId }) => {
    await mediator.dispatch({ type: "notify.broadcastInterested", courseId });
  });

  // Review submitted → update course aggregate rating
  bus.on("lms.review.submitted", async ({ courseId }) => {
    const avg = await db.select({ avg: avg(lmsReviews.rating), count: count() })
      .from(lmsReviews)
      .where(eq(lmsReviews.courseId, courseId));
    await db.update(lmsCourses).set({
      rating: avg[0].avg?.toString() ?? "0",
      reviewCount: avg[0].count,
    }).where(eq(lmsCourses.id, courseId));
  });

  // Payment succeeded → activate enrollment
  bus.on("payment.succeeded", async ({ metadata }) => {
    if (metadata?.enrollmentId) {
      await activateEnrollment(metadata.enrollmentId, metadata.paymentId, metadata.amount);
    }
  });
}
```

---

## 10.3 `registerLmsJobs(scheduler, mediator)`

```typescript
export function registerLmsJobs(scheduler: Scheduler, mediator: Mediator): void {

  // Expire enrollments daily at midnight
  scheduler.register({
    name: "lms.expire-enrollments",
    cron: "0 0 * * *",
    fn: async () => {
      const expired = await db.update(lmsEnrollments)
        .set({ status: "expired" })
        .where(and(
          eq(lmsEnrollments.status, "active"),
          lt(lmsEnrollments.expiresAt, new Date())
        ))
        .returning({ id: lmsEnrollments.id, learnerId: lmsEnrollments.learnerId });

      for (const enr of expired) {
        bus.emit("lms.enrollment.expired", enr);
      }
    },
  });

  // Inactivity nudge — learners with no activity in N days
  scheduler.register({
    name: "lms.inactivity-nudge",
    cron: "0 9 * * *",   // 9AM daily
    fn: async () => {
      const orgConfigs = await db.query.lmsOrgConfig.findMany();
      for (const config of orgConfigs) {
        const cutoff = new Date(Date.now() - config.inactivityNudgeDays * 86400000);
        const inactive = await db.query.lmsEnrollments.findMany({
          where: and(
            eq(lmsEnrollments.status, "active"),
            lt(lmsEnrollments.lastAccessedAt, cutoff)
          ),
        });
        for (const enr of inactive) {
          await mediator.dispatch({
            type: "notify.sendEmail",
            to: enr.learnerId,
            template: "inactivity-nudge",
            data: { enrollmentId: enr.id, courseId: enr.courseId },
          });
        }
      }
    },
  });

  // Live session reminder — 15 min before start
  scheduler.register({
    name: "lms.session-reminders",
    cron: "*/5 * * * *",   // every 5 min
    fn: async () => {
      const in15Min = new Date(Date.now() + 15 * 60 * 1000);
      const window = new Date(Date.now() + 14 * 60 * 1000);
      const upcoming = await db.query.lmsLiveSessions.findMany({
        where: and(
          eq(lmsLiveSessions.status, "scheduled"),
          gte(lmsLiveSessions.scheduledAt, window),
          lte(lmsLiveSessions.scheduledAt, in15Min)
        ),
      });
      for (const session of upcoming) {
        await mediator.dispatch({ type: "notify.broadcastSession", sessionId: session.id });
      }
    },
  });

  // Waitlist expiry — 24h after notification, re-open slot
  scheduler.register({
    name: "lms.waitlist-expiry",
    cron: "*/30 * * * *",
    fn: async () => {
      const expired = await db.update(lmsWaitlist)
        .set({ status: "expired" })
        .where(and(
          eq(lmsWaitlist.status, "notified"),
          lt(lmsWaitlist.notifiedAt, new Date(Date.now() - 24 * 3600000))
        ))
        .returning({ cohortId: lmsWaitlist.cohortId });

      // Notify next in queue for each affected cohort
      const cohortIds = [...new Set(expired.map(e => e.cohortId))];
      for (const cohortId of cohortIds) {
        await notifyNextWaitlisted(cohortId);
      }
    },
  });

  // Nightly analytics aggregation
  scheduler.register({
    name: "lms.analytics-aggregate",
    cron: "0 2 * * *",   // 2AM daily
    fn: async () => {
      await aggregateDailyLmsMetrics();
    },
  });
}
```

---

## 10.4 LMS Business Rules

```typescript
export const LMS_RULES = [
  {
    id: "free-course-bypass",
    rule: "Free course (price=0 after coupon) goes directly to active — skip payment gate",
  },
  {
    id: "duplicate-enrollment-guard",
    rule: "Same learner + same course + non-cancelled status → ConflictError, checked atomically in transaction",
  },
  {
    id: "quiz-attempts-server-side",
    rule: "Max quiz attempts enforced at submission-create, not on client. Client never decides.",
  },
  {
    id: "certificate-threshold",
    rule: "Certificate issued only when completionPct >= course.completionThreshold (never issue early)",
  },
  {
    id: "sequential-unlock",
    rule: "requiredPrevious = true → previous module must be completed before access; checked in assertModuleAccess",
  },
  {
    id: "deferred-revenue",
    rule: "Revenue recognized proportionally per module completion, not at enrollment time",
  },
  {
    id: "heartbeat-debounce",
    rule: "Video heartbeat: max 1 DB write per 10s per enrollment+module; excess dropped in-memory",
  },
  {
    id: "verification-code-unique",
    rule: "Certificate verificationCode = LMS-{ulid().slice(-8).toUpperCase()}. DB UNIQUE constraint is final guard.",
  },
  {
    id: "cancellation-window",
    rule: "Learner can cancel within orgConfig.refundWindowDays; outside window only lms-admin can cancel",
  },
  {
    id: "cohort-capacity-atomic",
    rule: "Cohort capacity check uses WHERE enrolled_count < capacity in UPDATE — no row lock needed",
  },
] as const;
```

---

## 10.5 Workflow Templates

```typescript
export const LMS_WORKFLOW_TEMPLATES = [
  {
    id: "COURSE_REVIEW",
    name: "Course Content Review",
    steps: [
      { id: "review", role: "content-reviewer", action: "Review and approve/reject course content" },
      { id: "legal", role: "lms-admin", action: "Legal/IP compliance check (optional)" },
    ],
  },
  {
    id: "INSTRUCTOR_ONBOARDING",
    name: "Instructor Onboarding",
    steps: [
      { id: "profile", role: "lms-admin", action: "Verify instructor credentials and profile" },
      { id: "payout", role: "lms-admin", action: "Set up payout account" },
      { id: "agreement", role: "lms-admin", action: "Sign instructor agreement" },
    ],
  },
];
```
