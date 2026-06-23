# Phase 10 — Backend Logic (FSMs, Hooks, Jobs, Rules)

---

## 10.1 All FSMs Summary

FSMs for master table entities (course, enrollment) operate via pipeline stage transitions. Stages live in `pipelines` + `pipeline_stages` master tables, filtered by `entityType`.

| Entity | Pipeline entityType / table | Stages |
|--------|-----------------------------|--------|
| Course | `pipelines` (entityType=lms.course) | `Draft → In Review → Published \| Archived` |
| Enrollment | `pipelines` (entityType=lms.enrollment) | `Enrolled → In Progress → Completed \| Dropped` |
| Lesson Progress | `lms_progress` (detail table) | `null completedAt = incomplete; not null = complete` |
| Submission | `lms_submissions` (detail table) | `submitted → grading → graded → returned` |
| Cohort | `lms_cohorts` (detail table) | `scheduled → active → completed \| cancelled` |
| Live Session | `activities` master (type=meeting) | `scheduled → live → ended → recorded \| cancelled` via activity status field |

---

## 10.2 `registerLmsHooks(bus, mediator)`

```typescript
export function registerLmsHooks(bus: EventBus, mediator: Mediator): void {

  // Enrollment activated → no need to seed progress records;
  // progress is written on first lesson interaction via lms_progress detail table
  bus.on("lms.enrollment.activated", async ({ transactionId, personId, itemId }) => {
    await mediator.dispatch({ type: "notification.send", personId, template: "enrollment-confirmed", data: { itemId } });
  });

  // Lesson completed → check if course is fully complete
  bus.on("lms.lesson.completed", async ({ personId, lessonId, itemId /* courseItemId */ }) => {
    const detail = await db.query.lmsCourseDetail.findFirst({ where: eq(lmsCourseDetail.itemId, itemId) });
    const allLessons = await getAllCourseLessons(itemId);
    const completedCount = await db.select({ count: count() }).from(lmsProgress)
      .where(and(eq(lmsProgress.personId, personId), inArray(lmsProgress.lessonId, allLessons.map(l => l.id)), isNotNull(lmsProgress.completedAt)));
    const pct = Math.round((completedCount[0].count / allLessons.length) * 100);
    if (pct >= (detail?.completionThreshold ?? 80)) {
      // Advance enrollment transaction to Completed stage
      await mediator.dispatch({ type: "commerce.advanceTransactionStage", itemId, personId, stageId: completedStageId });
      bus.emit("lms.enrollment.completed", { personId, itemId });
    }
  });

  // Enrollment completed → issue certificate
  bus.on("lms.enrollment.completed", async ({ personId, itemId, transactionId }) => {
    await issueCertificate(transactionId, personId, itemId);
    await mediator.dispatch({ type: "accounting.recognizeAllDeferredRevenue", transactionId });
    await mediator.dispatch({ type: "payout.triggerInstructor", itemId, transactionId });
  });

  // Cohort cancelled → drop all active enrollment transactions
  bus.on("lms.cohort.cancelled", async ({ cohortId }) => {
    const members = await db.query.lmsCohortMembers.findMany({ where: eq(lmsCohortMembers.cohortId, cohortId) });
    for (const member of members) {
      await mediator.dispatch({ type: "commerce.advanceTransactionStage", transactionId: member.transactionId, stageId: droppedStageId });
      await mediator.dispatch({ type: "payment.refund", transactionId: member.transactionId });
    }
  });

  // Course pipeline moved to Published stage → notify interested learners
  bus.on("lms.course.published", async ({ itemId }) => {
    await mediator.dispatch({ type: "notify.broadcastInterested", itemId });
  });

  // Payment succeeded → advance enrollment transaction to In Progress stage
  bus.on("payment.succeeded", async ({ metadata }) => {
    if (metadata?.transactionId) {
      await mediator.dispatch({ type: "commerce.advanceTransactionStage", transactionId: metadata.transactionId, stageId: inProgressStageId });
      bus.emit("lms.enrollment.activated", { transactionId: metadata.transactionId, personId: metadata.personId, itemId: metadata.itemId });
    }
  });
}
```

---

## 10.3 `registerLmsJobs(scheduler, mediator)`

```typescript
export function registerLmsJobs(scheduler: Scheduler, mediator: Mediator): void {

  // Expire enrollments daily at midnight
  // Enrollments live in `transactions` master table. Advance expired ones to "Dropped" stage.
  scheduler.register({
    name: "lms.expire-enrollments",
    cron: "0 0 * * *",
    fn: async () => {
      // Query transactions with entityType context stored in meta.expiresAt
      // Compose reads transactions filtered by type=order and checks meta.expiresAt < now
      const expired = await getExpiredEnrollmentTransactions();
      for (const txn of expired) {
        await mediator.dispatch({ type: "commerce.advanceTransactionStage", transactionId: txn.id, stageId: droppedStageId });
        bus.emit("lms.enrollment.expired", { transactionId: txn.id, personId: txn.personId });
      }
    },
  });

  // Inactivity nudge — learners with no lms_progress activity in N days
  scheduler.register({
    name: "lms.inactivity-nudge",
    cron: "0 9 * * *",   // 9AM daily
    fn: async () => {
      const orgConfigs = await db.query.lmsOrgConfig.findMany();
      for (const config of orgConfigs) {
        const cutoff = new Date(Date.now() - config.inactivityNudgeDays * 86400000);
        // Find active enrollment transactions with no lms_progress updates since cutoff
        const inactive = await getInactiveEnrollments(config.orgId, cutoff);
        for (const enr of inactive) {
          await mediator.dispatch({
            type: "notification.send",
            personId: enr.personId,
            template: "inactivity-nudge",
            data: { transactionId: enr.id, itemId: enr.itemId },
          });
        }
      }
    },
  });

  // Live session reminder — 15 min before start
  // Live sessions are activities (type=meeting). Query via mediator or direct Drizzle on activities.
  scheduler.register({
    name: "lms.session-reminders",
    cron: "*/5 * * * *",   // every 5 min
    fn: async () => {
      const in15Min = new Date(Date.now() + 15 * 60 * 1000);
      const window = new Date(Date.now() + 14 * 60 * 1000);
      const upcoming = await db.query.activities.findMany({
        where: and(
          eq(activities.type, "meeting"),
          eq(activities.status, "scheduled"),
          gte(activities.dueAt, window),
          lte(activities.dueAt, in15Min)
        ),
      });
      for (const session of upcoming) {
        await mediator.dispatch({ type: "notify.broadcastSession", activityId: session.id });
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
    rule: "Free course (price=0 after coupon) creates transaction directly in 'In Progress' stage — skip payment gate",
  },
  {
    id: "duplicate-enrollment-guard",
    rule: "Same person + same course item + non-dropped/cancelled transaction → ConflictError, checked atomically",
  },
  {
    id: "quiz-attempts-server-side",
    rule: "Max quiz attempts enforced at submission-create, not on client. Count via lms_submissions.",
  },
  {
    id: "certificate-threshold",
    rule: "Certificate issued only when completed lesson count / total lessons >= lms_course_detail.completionThreshold",
  },
  {
    id: "sequential-unlock",
    rule: "Previous lesson in module must have lms_progress.completedAt set before next lesson is accessible; checked in assertLessonAccess",
  },
  {
    id: "deferred-revenue",
    rule: "Revenue recognized proportionally per lesson completion, not at enrollment time",
  },
  {
    id: "heartbeat-debounce",
    rule: "Video heartbeat: max 1 lms_progress update per 10s per person+lesson; excess dropped in-memory",
  },
  {
    id: "certificate-no-unique",
    rule: "Certificate certificateNo = LMS-{ulid().slice(-8).toUpperCase()}. DB UNIQUE constraint is final guard.",
  },
  {
    id: "cancellation-window",
    rule: "Learner can drop enrollment within orgConfig.refundWindowDays; outside window only lms-admin can drop",
  },
  {
    id: "cohort-capacity-atomic",
    rule: "Cohort capacity check: count lms_cohort_members before insert; wrap in DB transaction",
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
