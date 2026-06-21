# Phase 5 — Progress & Learning

---

## 5.1 Progress Routes

```
GET    /lms/enrollments/:id/progress           learner (own)
POST   /lms/progress/heartbeat                 learner
POST   /lms/progress/:moduleId/complete        learner
POST   /lms/progress/quiz/submit               learner
GET    /lms/instructor/courses/:id/progress    enrollment:read
```

---

## 5.2 Module Progress Tracking

On enrollment activated, seed progress records for all published modules:

```typescript
async function seedModuleProgress(enrollmentId: string, courseId: string, learnerId: string): Promise<void> {
  const modules = await db.query.lmsCourseModules.findMany({
    where: and(eq(lmsCourseModules.courseId, courseId), eq(lmsCourseModules.isPublished, true)),
  });
  if (modules.length === 0) return;

  await db.insert(lmsModuleProgress).values(
    modules.map((m) => ({
      enrollmentId,
      moduleId: m.id,
      learnerId,
      courseId,
      status: "not-started",
    }))
  );
}
```

---

## 5.3 Video Heartbeat

`POST /lms/progress/heartbeat`

Debounced: accept at most 1 DB update per 10 seconds per enrollment per module.
Implemented via in-memory last-update map keyed by `enrollmentId:moduleId` (or Redis for multi-server).

Body:
```typescript
{
  enrollmentId: string;
  moduleId: string;
  progressPct: number;   // 0–100
  timeSpentSec: number;  // cumulative seconds this session
}
```

Handler:
```typescript
const HEARTBEAT_MIN_INTERVAL_MS = 10_000;
const lastHeartbeat = new Map<string, number>();

async function handleHeartbeat(learnerId: string, body: HeartbeatBody): Promise<void> {
  const key = `${body.enrollmentId}:${body.moduleId}`;
  const last = lastHeartbeat.get(key) ?? 0;
  if (Date.now() - last < HEARTBEAT_MIN_INTERVAL_MS) return;  // drop

  lastHeartbeat.set(key, Date.now());

  await db.update(lmsModuleProgress)
    .set({
      status: "in-progress",
      startedAt: sql`COALESCE(started_at, NOW())`,
      progressPct: body.progressPct,
      timeSpentSec: sql`time_spent_sec + ${body.timeSpentSec}`,
    })
    .where(and(
      eq(lmsModuleProgress.enrollmentId, body.enrollmentId),
      eq(lmsModuleProgress.moduleId, body.moduleId)
    ));

  // Update lastAccessedAt on enrollment
  await db.update(lmsEnrollments)
    .set({ lastAccessedAt: new Date() })
    .where(eq(lmsEnrollments.id, body.enrollmentId));
}
```

---

## 5.4 Complete a Module

`POST /lms/progress/:moduleId/complete`

Body: `{ enrollmentId: string }`

Guards:
1. Enrollment `status = 'active'`
2. Module must not already be `completed`
3. For video modules: `progressPct >= 90` (configurable)
4. For quiz modules: must have a passing quiz submission (see 5.5)
5. For assignment modules: must have a `graded` submission with `score >= assignment.passingScore`

On complete:
```typescript
await db.transaction(async (tx) => {
  await tx.update(lmsModuleProgress).set({
    status: "completed",
    completedAt: new Date(),
    progressPct: 100,
  }).where(and(
    eq(lmsModuleProgress.enrollmentId, enrollmentId),
    eq(lmsModuleProgress.moduleId, moduleId)
  ));

  // Recompute enrollment completionPct
  const allProgress = await tx.query.lmsModuleProgress.findMany({
    where: eq(lmsModuleProgress.enrollmentId, enrollmentId),
  });
  const completed = allProgress.filter((p) => p.status === "completed").length;
  const total = allProgress.length;
  const pct = Math.floor((completed / total) * 100);

  await tx.update(lmsEnrollments).set({ completionPct: pct })
    .where(eq(lmsEnrollments.id, enrollmentId));

  // Recognize deferred revenue proportionally
  const course = await tx.query.lmsCourses.findFirst({ where: eq(lmsCourses.id, enrollment.courseId) });
  const revenueShare = parseFloat(enrollment.pricePaid) / total;
  await mediator.dispatch({ type: "accounting.recognizeRevenue", amount: revenueShare, enrollmentId, moduleId });
});

// Check if course completion threshold met
if (newPct >= course.completionThreshold) {
  await completeEnrollment(enrollmentId);  // handles certificate issuance
}

// Unlock next module if sequential
await unlockNextModule(enrollmentId, moduleId, courseId);
```

---

## 5.5 Sequential Module Unlock

```typescript
async function unlockNextModule(enrollmentId: string, completedModuleId: string, courseId: string): Promise<void> {
  const modules = await db.query.lmsCourseModules.findMany({
    where: and(eq(lmsCourseModules.courseId, courseId), eq(lmsCourseModules.isPublished, true)),
    orderBy: [asc(lmsCourseModules.sortOrder)],
  });

  const currentIndex = modules.findIndex((m) => m.id === completedModuleId);
  if (currentIndex === -1 || currentIndex === modules.length - 1) return;

  const nextModule = modules[currentIndex + 1];
  if (!nextModule.requiredPrevious) return;  // not locked

  // Emit unlock event — frontend uses this to refresh module list
  bus.emit("lms.module.unlocked", { enrollmentId, moduleId: nextModule.id });
}
```

---

## 5.6 Quiz Submission

`POST /lms/progress/quiz/submit`

Body:
```typescript
{
  enrollmentId: string;
  moduleId: string;
  answers: { questionId: string; answer: string | string[] }[];
}
```

Guards:
1. Module `type = 'quiz'`
2. Enrollment `status = 'active'`
3. Attempt count check:
```typescript
const attempts = await db.query.lmsModuleProgress.findFirst({
  where: and(eq(lmsModuleProgress.enrollmentId, enrollmentId), eq(lmsModuleProgress.moduleId, moduleId)),
});
const maxAttempts = course.maxQuizAttempts ?? orgConfig.maxQuizAttempts;
if (attempts.quizAttempts >= maxAttempts) {
  throw new ConflictError("MAX_ATTEMPTS_REACHED", `Maximum ${maxAttempts} attempts allowed`);
}
```

Scoring:
```typescript
const questions = await db.query.lmsQuizQuestions.findMany({ where: eq(lmsQuizQuestions.moduleId, moduleId) });
let earned = 0;
let total = 0;
const results = questions.map((q) => {
  const points = parseFloat(q.points ?? "1");
  total += points;
  const answer = answers.find((a) => a.questionId === q.id)?.answer;
  const correct = isCorrect(q, answer);
  if (correct) earned += points;
  return { questionId: q.id, correct, correctAnswer: q.correctAnswer, explanation: q.explanation };
});

const score = (earned / total) * 100;
const passed = score >= parseFloat(assignment.passingScore);

await db.update(lmsModuleProgress).set({
  quizScore: score.toString(),
  quizAttempts: sql`quiz_attempts + 1`,
}).where(...);
```

Returns: `{ score, passed, results, attemptsUsed, attemptsLeft }`.

If passed + module completion criteria met → trigger module complete.
