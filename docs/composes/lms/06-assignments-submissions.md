# Phase 6 — Assignments & Submissions

---

## 6.1 Assignment Routes

```
GET    /lms/instructor/courses/:id/assignments    module:update (own)
POST   /lms/instructor/courses/:id/assignments    module:update (own)
PATCH  /lms/instructor/assignments/:id            module:update (own)
DELETE /lms/instructor/assignments/:id            module:update (own)
GET    /lms/assignments/:id                       learner (enrolled)
POST   /lms/assignments/:id/submit                learner (enrolled)
GET    /lms/submissions/:id                       learner (own) | module:update
PATCH  /lms/submissions/:id/grade                 module:update (own instructor)
GET    /lms/instructor/assignments/:id/submissions  module:update (own)
```

---

## 6.2 Submission Flow

`POST /lms/assignments/:id/submit`

Body:
```typescript
{
  enrollmentId: string;
  content?: string;            // text response
  attachmentIds?: string[];    // doc refs from media upload
}
```

Guards:
1. Enrollment `status = 'active'`
2. Assignment belongs to a module in learner's enrolled course
3. **Attempt limit** (server-side, never trust client):
```typescript
const prevAttempts = await db.query.lmsSubmissions.findMany({
  where: and(
    eq(lmsSubmissions.assignmentId, assignmentId),
    eq(lmsSubmissions.learnerId, learnerId)
  ),
});
if (prevAttempts.length >= assignment.maxAttempts) {
  throw new ConflictError("MAX_ATTEMPTS_REACHED", `Maximum ${assignment.maxAttempts} attempts allowed`);
}
```
4. Due date check:
```typescript
function computeDueDate(assignment: Assignment, enrollment: Enrollment): Date | null {
  if (assignment.absoluteDueDate) return assignment.absoluteDueDate;
  if (assignment.dueHoursAfterEnrollment) {
    return new Date(enrollment.createdAt.getTime() + assignment.dueHoursAfterEnrollment * 3600000);
  }
  return null;
}

const dueDate = computeDueDate(assignment, enrollment);
if (dueDate && new Date() > dueDate && !assignment.allowLateSubmission) {
  throw new ConflictError("SUBMISSION_OVERDUE", "Due date has passed and late submissions are not allowed");
}
```

On submit:
1. `attemptNumber = prevAttempts.length + 1`
2. `status = 'submitted'` (if late: `status = 'late'`)
3. If `assignment.type = 'quiz'`: auto-grade (same logic as progress/quiz), set status = `graded`
4. If peer review: emit `lms.submission.needs-peer-review`
5. Notify instructor: new submission to grade

---

## 6.3 Grade Submission

`PATCH /lms/submissions/:id/grade`

Body:
```typescript
{
  score: number;
  feedback?: string;
}
```

Guards:
1. Submission `status = 'submitted' | 'late'`
2. Role must be instructor of the course (or lms-admin)
3. `score >= 0 && score <= assignment.maxScore`

On grade:
```typescript
await db.update(lmsSubmissions).set({
  score: score.toString(),
  feedback,
  gradedBy: actorId,
  gradedAt: new Date(),
  status: "graded",
}).where(eq(lmsSubmissions.id, submissionId));
```

Post-grade:
1. Notify learner: "Your submission has been graded"
2. If `score >= assignment.passingScore`: trigger module completion check
3. If `score < assignment.passingScore` and `attemptsLeft > 0`: notify learner they can re-submit

---

## 6.4 Submission FSM

```
submitted ──[grade.submit]──► graded
  guard: instructor role
  entry: notify learner

submitted ──[grade.return]──► returned
  guard: instructor role, reason required
  entry: learner can re-submit (if attempts remain)

late ──[grade.submit]──► graded

graded ──[grade.return]──► returned  (for revision)

auto-graded (quiz): submitted → graded immediately
```

---

## 6.5 Peer Review Assignment

For `type = 'peer-review'`:
1. After submit: system assigns 2–3 peer reviewers from same cohort (randomly sampled from `active` enrollments)
2. Reviewers get `lms.submission.needs-peer-review` notification
3. Each peer submits a grade + feedback via `PATCH /lms/submissions/:id/peer-grade`
4. After all peers complete: compute average score → set as final score → auto-grade

`PATCH /lms/submissions/:id/peer-grade`

Body: `{ score: number; feedback: string }`

Guards:
1. Requester is an assigned peer (checked via `peerReviewers[]` jsonb on submission)
2. Requester cannot grade own submission

---

## 6.6 Assignment List for Learner

`GET /lms/assignments/:id` — returns assignment details with:
- `submissionsUsed` — how many attempts used
- `attemptsLeft` — remaining
- `dueDate` — computed from enrollment + assignment config
- `latestSubmission` — most recent submission object (score, feedback, status)
- `canResubmit` — boolean (status = 'returned' or 'late' and attemptsLeft > 0)
