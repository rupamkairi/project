# Phase 1 — Foundation

---

## 1.0 Master Table Architecture Note

LMS compose does **not** create or migrate master tables (`cat_items`, `persons`, `transactions`, `activities`, `pipelines`, `pipeline_stages`). These are provisioned by foundation modules.

Run `bun db:push` from the project root to apply foundation migrations before running lms migrations.

The schema migration in this phase creates only lms_ detail tables:
`lms_course_detail`, `lms_modules`, `lms_lessons`, `lms_assignments`, `lms_submissions`, `lms_quizzes`, `lms_quiz_questions`, `lms_certificates`, `lms_cohorts`, `lms_cohort_members`, `lms_progress`, `lms_discussions`, `lms_discussion_replies`, `lms_org_config`, `lms_coupons`.

Pipelines are seeded (not migrated) via:
```typescript
import { seedPipeline } from "apps/server/src/infra/db/seed"
await seedPipeline(orgId, "lms.course", [
  { name: "Draft" }, { name: "In Review" }, { name: "Published" }, { name: "Archived" },
])
await seedPipeline(orgId, "lms.enrollment", [
  { name: "Enrolled" }, { name: "In Progress" }, { name: "Completed" }, { name: "Dropped" },
])
```

---

## 1.1 Package Structure

```
composes/lms/
  server/
    src/
      index.ts
      routes/
        courses/
        enrollments/
        learning/
        assignments/
        cohorts/
        certificates/
        analytics/
      hooks/
      jobs/
      fsm/
      rules/
      schema/
    package.json

packages/lms-web/
  src/
    index.ts
    routes.tsx
    apps/
      learner/
      instructor/
      admin/
    api/lms-client.ts
    stores/
    components/shared/
  package.json
```

---

## 1.2 Compose Factory Skeleton

**File:** `composes/lms/server/src/index.ts`

```typescript
import Elysia from "elysia";
import { registerLmsHooks } from "./hooks/lms.hooks";
import { registerLmsJobs } from "./jobs/lms.jobs";

export function createLmsCompose(mediator: Mediator, bus: EventBus, scheduler: Scheduler) {
  registerLmsHooks(bus, mediator);
  registerLmsJobs(scheduler, mediator);

  return new Elysia({ prefix: "/lms" })
    .use(courseRoutes(mediator))
    .use(enrollmentRoutes(mediator))
    .use(learningRoutes(mediator))
    .use(assignmentRoutes(mediator))
    .use(cohortRoutes(mediator))
    .use(certificateRoutes(mediator))
    .use(analyticsRoutes(mediator));
}

export type LmsApp = ReturnType<typeof createLmsCompose>;
```

---

## 1.3 Permissions Matrix

| Permission | lms-admin | content-reviewer | instructor | learner | org-admin |
|-----------|-----------|-----------------|------------|---------|-----------|
| `course:create` | ✓ | — | ✓ | — | — |
| `course:read` | ✓ | ✓ | ✓ | ✓(pub) | ✓ |
| `course:update` | ✓ | — | own | — | — |
| `course:publish` | ✓ | ✓ | — | — | — |
| `course:archive` | ✓ | — | own | — | — |
| `module:create` | ✓ | — | own | — | — |
| `module:read` | ✓ | ✓ | ✓ | enrolled | ✓ |
| `module:update` | ✓ | — | own | — | — |
| `enrollment:create` | ✓ | — | — | ✓ | ✓ |
| `enrollment:read` | ✓ | — | own course | own | ✓ |
| `enrollment:manage` | ✓ | — | own course | — | ✓ |
| `cohort:create` | ✓ | — | ✓ | — | — |
| `cohort:manage` | ✓ | — | own | — | — |
| `session:create` | ✓ | — | own | — | — |
| `session:start` | ✓ | — | own | — | — |
| `assignment:create` | ✓ | — | own | — | — |
| `submission:create` | ✓ | — | — | enrolled | — |
| `submission:grade` | ✓ | — | own | — | — |
| `certificate:read` | ✓ | — | — | own | ✓ |
| `certificate:revoke` | ✓ | — | — | — | — |
| `analytics:read` | ✓ | — | own | — | ✓ |

---

## 1.4 ID Prefix Table

| Entity | Prefix | Example |
|--------|--------|---------|
| Course | `crs_` | `crs_01HX...` |
| CourseModule | `mod_` | `mod_01HX...` |
| Enrollment | `enr_` | `enr_01HX...` |
| ModuleProgress | `prg_` | `prg_01HX...` |
| Assignment | `asg_` | `asg_01HX...` |
| Submission | `sub_` | `sub_01HX...` |
| Certificate | `crt_` | `crt_01HX...` |
| Cohort | `coh_` | `coh_01HX...` |
| LiveSession | `ses_` | `ses_01HX...` |
| Category | `cat_` | `cat_01HX...` |
| Coupon | `cpn_` | `cpn_01HX...` |
| Review | `rev_` | `rev_01HX...` |

---

## 1.5 Package.json Files

**`composes/lms/server/package.json`:**
```json
{
  "name": "@projectx/lms-compose",
  "version": "0.1.0",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  }
}
```

**`packages/lms-web/package.json`:**
```json
{
  "name": "@projectx/lms-web",
  "version": "0.1.0",
  "exports": { ".": "./src/index.ts" }
}
```
