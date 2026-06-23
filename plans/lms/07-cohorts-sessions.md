# Phase 7 — Cohorts & Live Sessions

---

## 7.1 Cohort Routes

```
GET    /lms/instructor/courses/:id/cohorts      course:update (own)
POST   /lms/instructor/courses/:id/cohorts      course:update (own)
PATCH  /lms/instructor/cohorts/:id              course:update (own)
POST   /lms/instructor/cohorts/:id/activate     course:update (own)
POST   /lms/instructor/cohorts/:id/complete     course:update (own)
POST   /lms/instructor/cohorts/:id/cancel       course:update (own)
GET    /lms/admin/cohorts                       enrollment:manage
```

Cohorts are stored in the `lms_cohorts` detail table. The associated course is referenced as `itemId` (cat_items.id, type=course). Members are tracked in `lms_cohort_members` with a `transactionId` back to the enrollment order.

**Create cohort body:**
```typescript
{
  itemId: string;            // cat_items.id — the course
  name: string;
  startDate: string;         // ISO datetime
  endDate: string;
  maxSize?: number;
}
```

---

## 7.2 Cohort FSM

```
scheduled ──[cohort.activate]──► active
  guard: startDate <= now or instructor triggers manually
  entry: notify enrolled learners, create calendar invites if configured

active ──[cohort.complete]──► completed
  guard: endDate passed or instructor triggers
  entry: trigger enrollment completion check for all cohort enrollments

active ──[cohort.cancel]──► cancelled
  guard: instructor or lms-admin
  entry: cancel all active enrollments in this cohort, refund if pricePaid > 0
  entry: notify all enrolled learners

scheduled ──[cohort.cancel]──► cancelled
```

On `cohort.cancel`: batch cancel all `active` enrollments in this cohort. Emit `lms.enrollment.cancelled` per learner.

Waitlist behavior: when enrollment count < capacity, pop first `waiting` entry, set `notified`, send spot notification.

---

## 7.3 Live Session Routes

Live sessions are `activities` (type=meeting) in the master table. Created via mediator command `activity.log`. The `entityId` links to a cohort or course; `entityType` is `"lms.cohort"` or `"lms.course"`. `actorId` is the instructor's `persons.id`.

```
GET    /lms/instructor/cohorts/:id/sessions      course:update (own)
POST   /lms/instructor/cohorts/:id/sessions      course:update (own)
PATCH  /lms/instructor/sessions/:id              course:update (own)
DELETE /lms/instructor/sessions/:id              course:update (own)
POST   /lms/instructor/sessions/:id/start        course:update (own)
POST   /lms/instructor/sessions/:id/end          course:update (own)
GET    /lms/learner/sessions                     learner (enrolled in cohort)
POST   /lms/sessions/:id/attendance              internal | learner
GET    /lms/instructor/sessions/:id/attendance   course:update (own)
```

---

## 7.4 Live Session FSM

```
scheduled ──[session.start]──► live
  guard: scheduledAt within 15min window OR instructor override
  entry: sendAt = now(), notify enrolled learners with join link

live ──[session.end]──► ended
  guard: instructor role
  entry: endedAt = now(), calculate attendeeCount

ended ──[session.add-recording]──► recorded
  entry: recordingUrl saved
  side-effect: attach recording to module if moduleId set
```

**Start session** auto-sends join link to enrolled learners 15 min before scheduled time (via cron or on-trigger).

---

## 7.5 Session Attendance

`POST /lms/sessions/:id/attendance`

Body: `{ learnerId: string; action: "join" | "leave" }`

Called from video platform webhook (Zoom/Meet/Teams) or learner app.

On `join`:
```typescript
const existing = await db.query.lmsSessionAttendance.findFirst({
  where: and(eq(lmsSessionAttendance.sessionId, sessionId), eq(lmsSessionAttendance.learnerId, learnerId))
});
if (!existing) {
  await db.insert(lmsSessionAttendance).values({ sessionId, learnerId, joinedAt: new Date() });
} else if (existing.leftAt) {
  // Re-joined — update joinedAt to latest join (track re-joins as separate rows or use latest)
  await db.insert(lmsSessionAttendance).values({ sessionId, learnerId, joinedAt: new Date() });
}
```

On `leave`:
```typescript
await db.update(lmsSessionAttendance)
  .set({
    leftAt: new Date(),
    durationMinutes: sql`EXTRACT(EPOCH FROM (NOW() - joined_at)) / 60`,
  })
  .where(and(
    eq(lmsSessionAttendance.sessionId, sessionId),
    eq(lmsSessionAttendance.learnerId, learnerId),
    isNull(lmsSessionAttendance.leftAt)  // most recent open record
  ));
```

After session ends: `session.attendeeCount = count(distinct learnerId)` in attendance table.

---

## 7.6 Cohort Enrollment Capacity Check

When a learner enrolls with `cohortId`:
```typescript
// Count current members — wrap in transaction
const memberCount = await db.select({ count: count() })
  .from(lmsCohortMembers)
  .where(eq(lmsCohortMembers.cohortId, cohortId));

const cohort = await db.query.lmsCohorts.findFirst({ where: eq(lmsCohorts.id, cohortId) });
if (cohort.maxSize && memberCount[0].count >= cohort.maxSize) {
  throw new ConflictError("COHORT_FULL", "This cohort is at capacity");
}

// Insert into lms_cohort_members with the transactionId from the enrollment
await db.insert(lmsCohortMembers).values({
  id: generateId(), organizationId: orgId,
  cohortId, personId, enrolledAt: new Date(), transactionId,
});
```

The count + insert wrapped in a DB transaction prevents race conditions.

---

## 7.7 Learner Session View

`GET /lms/learner/sessions`

Returns upcoming live sessions for courses the learner is enrolled in:
```typescript
{
  sessions: {
    id: string;
    courseTitle: string;
    cohortName: string;
    title: string;
    scheduledAt: string;
    durationMinutes: number;
    meetingUrl: string;
    status: string;
    attended?: boolean;  // did this learner attend
  }[];
}
```
