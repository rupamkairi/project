# Phase 20 — Data Seeding

All seed data follows the Master Table Architecture. Courses are seeded as `cat_items` (type=course). Students and instructors are seeded as `persons` (type=student|instructor). Enrollments are seeded as `transactions` (type=order). Live sessions are seeded as `activities` (type=meeting). Pipelines are seeded via `seedPipeline`.

---

## 20.1 Seed Entry Point

**File:** `composes/lms/server/src/seed.ts`

```typescript
import { db } from "@projectx/core/db";
import { generateId } from "@projectx/core/id";
import { seedPipeline } from "apps/server/src/infra/db/seed";
import { persons, catItems, transactions, transactionLines, activities } from "@projectx/core/schema";

export async function seedLms(orgId: string) {
  await seedPipelines(orgId);
  await seedOrgConfig(orgId);
  const instructors = await seedInstructors(orgId);
  const courses = await seedCourses(orgId, instructors);
  const students = await seedStudents(orgId);
  await seedEnrollments(orgId, students, courses);
  await seedCoupons(orgId, courses);
  console.log("[lms] seed complete");
}
```

---

## 20.2 Pipelines

```typescript
async function seedPipelines(orgId: string) {
  await seedPipeline(orgId, "lms.course", [
    { name: "Draft" },
    { name: "In Review" },
    { name: "Published" },
    { name: "Archived" },
  ]);
  await seedPipeline(orgId, "lms.enrollment", [
    { name: "Enrolled" },
    { name: "In Progress" },
    { name: "Completed" },
    { name: "Dropped" },
  ]);
}
```

---

## 20.3 Org Config

```typescript
async function seedOrgConfig(orgId: string) {
  await db.insert(lmsOrgConfig).values({
    orgId,
    defaultCompletionThreshold: 80,
    refundWindowDays: 14,
    inactivityNudgeDays: 14,
    maxQuizAttempts: 3,
    certificateExpiresAfterDays: null,
    allowLateSubmissionDefault: false,
  }).onConflictDoNothing();
}
```

---

## 20.4 Instructors

Instructors are `persons` with `type = "instructor"`.

```typescript
async function seedInstructors(orgId: string) {
  const rows = [
    { firstName: "Alice", lastName: "Chen", email: "alice@example.com" },
    { firstName: "Bob", lastName: "Patel", email: "bob@example.com" },
  ];

  return Promise.all(rows.map(async (r) => {
    const id = generateId();
    await db.insert(persons).values({
      id, organizationId: orgId,
      type: "instructor",
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      version: 1,
      meta: {},
    }).onConflictDoNothing();
    return id;
  }));
}
```

---

## 20.5 Courses

Courses are `cat_items` with `type = "course"`. Extended metadata goes in `lms_course_detail`.

```typescript
async function seedCourses(orgId: string, instructors: string[]) {
  const courseDefs = [
    {
      name: "React Fundamentals",
      sku: "LMS-001",
      instructorId: instructors[0],
      level: "beginner",
      durationHours: 4,
    },
    {
      name: "TypeScript Basics",
      sku: "LMS-002",
      instructorId: instructors[1],
      level: "beginner",
      durationHours: 3,
    },
  ];

  const courseIds: string[] = [];

  for (const def of courseDefs) {
    const itemId = generateId();
    await db.insert(catItems).values({
      id: itemId, organizationId: orgId,
      type: "course",
      name: def.name,
      sku: def.sku,
      version: 1,
      meta: { instructorId: def.instructorId },
    }).onConflictDoNothing();

    await db.insert(lmsCourseDetail).values({
      id: generateId(), organizationId: orgId,
      itemId,
      instructorId: def.instructorId,
      level: def.level,
      durationHours: def.durationHours.toString(),
      language: "en",
      prerequisites: [],
      isPublished: true,
      publishedAt: new Date(),
    }).onConflictDoNothing();

    // Seed modules and lessons
    const moduleId = generateId();
    await db.insert(lmsModules).values({
      id: moduleId, organizationId: orgId,
      itemId,
      title: "Getting Started",
      position: 1,
      isPublished: true,
    }).onConflictDoNothing();

    await db.insert(lmsLessons).values({
      id: generateId(), organizationId: orgId,
      moduleId,
      title: "Introduction",
      position: 1,
      contentType: "video",
      contentUrl: "https://example.com/intro.mp4",
      durationMinutes: 10,
      isFree: true,
      isPublished: true,
    }).onConflictDoNothing();

    courseIds.push(itemId);
  }
  return courseIds;
}
```

---

## 20.6 Students

Students are `persons` with `type = "student"`.

```typescript
async function seedStudents(orgId: string) {
  const learners = [
    { firstName: "Carol", lastName: "White", email: "carol@example.com" },
    { firstName: "Dave", lastName: "Kim", email: "dave@example.com" },
    { firstName: "Eva", lastName: "Santos", email: "eva@example.com" },
  ];

  return Promise.all(learners.map(async (l) => {
    const id = generateId();
    await db.insert(persons).values({
      id, organizationId: orgId,
      type: "student",
      firstName: l.firstName,
      lastName: l.lastName,
      email: l.email,
      version: 1,
      meta: {},
    }).onConflictDoNothing();
    return id;
  }));
}
```

---

## 20.7 Enrollments

Enrollments are `transactions` with `type = "order"` and lines referencing the course item.

```typescript
async function seedEnrollments(orgId: string, students: string[], courses: string[]) {
  // Get pipeline stage ids
  const inProgressStage = await getPipelineStageByName(orgId, "lms.enrollment", "In Progress");
  const completedStage = await getPipelineStageByName(orgId, "lms.enrollment", "Completed");

  const enrollments = [
    { personId: students[0], itemId: courses[0], stageId: inProgressStage.id },
    { personId: students[1], itemId: courses[0], stageId: completedStage.id },
    { personId: students[1], itemId: courses[1], stageId: inProgressStage.id },
    { personId: students[2], itemId: courses[1], stageId: inProgressStage.id },
  ];

  for (const e of enrollments) {
    const txnId = generateId();
    await db.insert(transactions).values({
      id: txnId, organizationId: orgId,
      type: "order",
      personId: e.personId,
      stageId: e.stageId,
      version: 1,
      meta: {},
    }).onConflictDoNothing();

    await db.insert(transactionLines).values({
      id: generateId(), organizationId: orgId,
      transactionId: txnId,
      itemId: e.itemId,
      qty: 1,
      meta: {},
    }).onConflictDoNothing();
  }
}
```

---

## 20.8 Coupons

Coupons remain in the lms_ detail table `lms_coupons`.

```typescript
async function seedCoupons(orgId: string, courses: string[]) {
  await db.insert(lmsCoupons).values([
    {
      id: generateId(), orgId,
      code: "WELCOME10",
      type: "percentage",
      value: "10.00",
      maxUses: 100,
      usedCount: 0,
      isActive: true,
      courseIds: [],  // applies to all
    },
    {
      id: generateId(), orgId,
      code: "REACT20",
      type: "percentage",
      value: "20.00",
      maxUses: 50,
      usedCount: 0,
      isActive: true,
      courseIds: [courses[0]],
    },
  ]).onConflictDoNothing();
}
```

---

## 20.9 Run Script

**File:** `composes/lms/server/src/seed-run.ts`

```typescript
import { seedLms } from "./seed";

const orgId = process.env.SEED_ORG_ID;
if (!orgId) throw new Error("SEED_ORG_ID required");

seedLms(orgId)
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
```

```bash
SEED_ORG_ID=org_xxx bun run composes/lms/server/src/seed-run.ts
```
