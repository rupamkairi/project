# Phase 5 — Progress & Learning

Progress tracking uses the `lms_progress` detail table (lesson-level). There is no `lms_module_progress` or `lms_enrollments` table — enrollment state lives in `transactions` (master table, type=order).

---

## 5.1 Progress Routes

```
GET    /lms/progress                           learner (own) — lesson progress for enrolled courses
POST   /lms/progress/heartbeat                 learner — video watch progress
POST   /lms/lessons/:lessonId/complete         learner — mark lesson complete
POST   /lms/lessons/:lessonId/quiz/submit      learner — submit quiz answers
GET    /lms/instructor/courses/:itemId/progress  enrollment:read — student progress overview
```

---

## 5.2 Lesson Progress Tracking

Progress is written to `lms_progress` on first interaction. No pre-seeding needed.

```typescript
// GET /lms/progress — returns lms_progress rows for the person's enrolled courses
const progress = await db.query.lmsProgress.findMany({
  where: eq(lmsProgress.personId, actor.personId),
});
```

---

## 5.3 Video Heartbeat

`POST /lms/progress/heartbeat`

Debounced: accept at most 1 DB write per 10 seconds per person per lesson.
Implemented via in-memory last-update map keyed by `personId:lessonId`.

Body:
```typescript
{
  lessonId: string;
  watchedSeconds: number;  // cumulative seconds watched this session
}
```

Handler:
```typescript
const HEARTBEAT_MIN_INTERVAL_MS = 10_000;
const lastHeartbeat = new Map<string, number>();

async function handleHeartbeat(personId: string, body: HeartbeatBody): Promise<void> {
  const key = `${personId}:${body.lessonId}`;
  const last = lastHeartbeat.get(key) ?? 0;
  if (Date.now() - last < HEARTBEAT_MIN_INTERVAL_MS) return;  // drop

  lastHeartbeat.set(key, Date.now());

  // Upsert lms_progress for this person + lesson
  await db
    .insert(lmsProgress)
    .values({
      id: generateId(),
      organizationId: actor.orgId,
      personId,
      lessonId: body.lessonId,
      watchedSeconds: body.watchedSeconds,
    })
    .onConflictDoUpdate({
      target: [lmsProgress.organizationId, lmsProgress.personId, lmsProgress.lessonId],
      set: { watchedSeconds: body.watchedSeconds },
    });
}
```

---

## 5.4 Complete a Lesson

`POST /lms/lessons/:lessonId/complete`

Guards:
1. Learner must have an active enrollment transaction for the course (check via transactions master table)
2. Lesson must not already be completed (`completedAt IS NOT NULL`)
3. For video lessons: watchedSeconds must cover >= 90% of durationMinutes * 60
4. For quiz lessons: must have a passing quiz submission

On complete:
```typescript
await db
  .insert(lmsProgress)
  .values({
    id: generateId(),
    organizationId: actor.orgId,
    personId: actor.personId,
    lessonId,
    completedAt: new Date(),
  })
  .onConflictDoUpdate({
    target: [lmsProgress.organizationId, lmsProgress.personId, lmsProgress.lessonId],
    set: { completedAt: new Date() },
  });

// Recognize deferred revenue proportionally
const allLessons = await getAllCourseLessons(itemId);
const revenueShare = transactionTotal / allLessons.length;
await mediator.dispatch({ type: "accounting.recognizeRevenue", amount: revenueShare, transactionId, lessonId });

bus.emit("lms.lesson.completed", { personId: actor.personId, lessonId, itemId });
```

The `lms.lesson.completed` hook (Phase 10) checks overall completion and advances the enrollment transaction stage.

---

## 5.5 Sequential Lesson Unlock

Sequential unlock is enforced at read time (assertLessonAccess in Phase 4). No unlock event needed — the frontend re-fetches progress to determine which lessons are accessible.

---

## 5.6 Quiz Submission

`POST /lms/lessons/:lessonId/quiz/submit`

Body:
```typescript
{
  answers: { questionId: string; answer: string | string[] }[];
}
```

Guards:
1. Lesson `contentType = 'quiz'`
2. Active enrollment transaction for the course
3. Attempt count check against `lmsOrgConfig.maxQuizAttempts`:
```typescript
const attemptCount = await db.select({ count: count() })
  .from(lmsSubmissions)
  .where(and(
    eq(lmsSubmissions.personId, actor.personId),
    eq(lmsSubmissions.assignmentId, quizAssignmentId)   // quiz mapped to assignment
  ));
const maxAttempts = orgConfig.maxQuizAttempts;
if (attemptCount[0].count >= maxAttempts) {
  throw new ConflictError("MAX_ATTEMPTS_REACHED", `Maximum ${maxAttempts} attempts allowed`);
}
```

Scoring:
```typescript
const quiz = await db.query.lmsQuizzes.findFirst({ where: eq(lmsQuizzes.lessonId, lessonId) });
const questions = await db.query.lmsQuizQuestions.findMany({ where: eq(lmsQuizQuestions.quizId, quiz.id) });

let earned = 0;
const results = questions.map((q) => {
  const answer = answers.find((a) => a.questionId === q.id)?.answer;
  const correct = isCorrect(q, answer);
  if (correct) earned++;
  return { questionId: q.id, correct, explanation: q.explanation };
});

const score = Math.round((earned / questions.length) * 100);
const passed = score >= (quiz.passingScore ?? 70);

// Record score in lms_progress
await db
  .insert(lmsProgress)
  .values({ id: generateId(), organizationId: actor.orgId, personId: actor.personId, lessonId, score: score.toString() })
  .onConflictDoUpdate({
    target: [lmsProgress.organizationId, lmsProgress.personId, lmsProgress.lessonId],
    set: { score: score.toString(), completedAt: passed ? new Date() : undefined },
  });
```

Returns: `{ score, passed, results, attemptsUsed, attemptsLeft }`.

If passed → trigger lesson complete (which checks overall course completion).
