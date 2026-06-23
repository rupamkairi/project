# Phase 3 — Courses & Modules

---

## 3.1 Course Routes

```
GET    /lms/courses                    public (published only)
GET    /lms/courses/:slug              public
GET    /lms/categories                 public
GET    /lms/search?q=&category=&level= public
POST   /lms/instructor/courses         course:create
GET    /lms/instructor/courses         instructor:own
GET    /lms/instructor/courses/:id     instructor:own
PATCH  /lms/instructor/courses/:id     course:update (own)
POST   /lms/instructor/courses/:id/submit-review   course:update (own)
GET    /lms/admin/courses              course:read (all)
POST   /lms/admin/courses/:id/approve  course:publish
POST   /lms/admin/courses/:id/reject   course:publish
POST   /lms/admin/courses/:id/archive  course:archive
```

**Create course body:**
```typescript
{
  title: string;
  description?: string;
  categoryId?: string;
  type: "self-paced" | "cohort" | "live-only" | "hybrid";
  level: "beginner" | "intermediate" | "advanced" | "all-levels";
  language?: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  completionThreshold?: number;  // default: org config value
  tags?: string[];
  previewVideoUrl?: string;
}
```

**Submit for review** (`/submit-review`):

Guards:
1. At least 1 published module exists → `course.moduleCount > 0`
2. Price is set (0 is valid for free)
3. Status is `draft` or `rejected` (re-submit after rejection)

On submit:
1. Status → `under-review`
2. Emit `course.submitted-for-review`
3. `mediator.dispatch({ type: "workflow.startProcess", templateId: "COURSE_REVIEW", entityId: courseId })`
4. Notify admins/reviewers

**Approve** (admin/reviewer):
1. Status → `published`
2. `publishedAt = now()`
3. `mediator.dispatch({ type: "catalog.publishItem", itemId: courseId })`
4. Emit `course.published`
5. Notify instructor: "Your course is live!"

**Reject** (admin/reviewer):
Body: `{ reason: string }` (required)
1. Status → `draft` (allows re-submission)
2. Notify instructor with rejection reason

---

## 3.2 Module Routes

```
GET    /lms/instructor/courses/:id/modules          module:read (own)
POST   /lms/instructor/courses/:id/modules          module:create (own)
PATCH  /lms/instructor/modules/:id                  module:update (own)
DELETE /lms/instructor/modules/:id                  module:update (own)
POST   /lms/instructor/courses/:id/modules/reorder  module:update (own)
GET    /lms/courses/:slug/modules                   public (free) | enrollment-gated
GET    /lms/courses/:slug/modules/:moduleId         enrollment-gated (unless isFree)
```

**Create module body:**
```typescript
{
  title: string;
  type: "video" | "article" | "quiz" | "assignment" | "live-session" | "download";
  description?: string;
  contentRef?: string;       // video URL or article URL
  contentDocId?: string;     // for downloads
  estimatedMinutes?: number;
  isFree?: boolean;          // preview without enrollment
  requiredPrevious?: boolean; // sequential lock
}
```

On create: `sortOrder` auto-assigned as `max(existing) + 10`. Allows gaps for easy reordering.

**Reorder** (`/reorder`):
Body: `{ moduleIds: string[] }` — ordered array.
Updates `sortOrder` of each module: index × 10.

After module created/deleted: no counter to update — module count is computed on demand by counting `lms_modules` rows for the given `itemId`.

---

## 3.3 Quiz Question Routes

```
GET    /lms/instructor/modules/:id/questions     module:update (own)
POST   /lms/instructor/modules/:id/questions     module:update (own)
PATCH  /lms/instructor/questions/:id             module:update (own)
DELETE /lms/instructor/questions/:id             module:update (own)
```

**Create question body:**
```typescript
{
  question: string;
  type: "mcq" | "true-false" | "text";
  options?: { id: string; text: string }[];   // for mcq
  correctAnswer: string | string[];            // option id(s) or text for text type
  points?: number;
  explanation?: string;
}
```

---

## 3.4 Review Routes

```
GET    /lms/courses/:slug/reviews     public
POST   /lms/enrollments/:id/review    learner (enrolled + completed)
```

Learner can only review after enrollment status = `completed`.

---

## 3.5 Course FSM

```
draft ──[course.submit-review]──► under-review
  guard: moduleCount > 0, price exists
  entry: workflow.startProcess(COURSE_REVIEW)

under-review ──[course.approve]──► published
  guard: role = content-reviewer or lms-admin
  entry: catalog.publishItem, publishedAt = now(), notify instructor

under-review ──[course.reject]──► draft
  guard: role = content-reviewer or lms-admin, reason required
  entry: notify instructor with reason

published ──[course.archive]──► archived
  guard: no active enrollments OR role = lms-admin
  entry: catalog.archiveItem, archivedAt = now()

archived ──[course.restore]──► draft
  guard: role = lms-admin only
```

---

## 3.6 Public Catalog Endpoint

`GET /lms/courses` returns paginated list of courses via mediator query to catalog module.

```typescript
const result = await mediator.query({
  type: "catalog.listItems",
  orgId: actor.orgId, actorId: actor.id,
  payload: { type: "course", page, limit }
})
```

The route then joins with `lms_course_detail` to enrich with level, durationHours, and instructorId.

Query params:
- `q` — full-text search on title + description
- `level` — beginner | intermediate | advanced
- `minPrice` / `maxPrice`
- `language`
- `sort` — newest | popular | price-asc | price-desc
- `page`, `limit` (default 20)

Each course in list response includes: id, name (title), sku (code), instructorName (resolved from persons), price (from cat_price_lists), durationHours, level (from lms_course_detail), isPublished.

**Instructor listing:**
```typescript
// GET /lms/instructors
const result = await mediator.query({
  type: "party.listPersons",
  orgId: actor.orgId, actorId: actor.id,
  payload: { type: "instructor", page, limit }
})
```
