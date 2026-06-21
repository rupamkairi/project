# Phase 20 — Data Seeding

---

## 20.1 Seed Entry Point

**File:** `packages/lms/src/seed.ts`

```typescript
import { db } from "@projectx/core/db";
import { createId } from "@paralleldrive/cuid2";

export async function seedLms(orgId: string) {
  await seedOrgConfig(orgId);
  const instructors = await seedInstructors(orgId);
  const categories = await seedCategories(orgId);
  const courses = await seedCourses(orgId, instructors, categories);
  const learners = await seedLearners(orgId);
  await seedEnrollments(orgId, learners, courses);
  await seedCoupons(orgId, courses);
  console.log("[lms] seed complete");
}
```

---

## 20.2 Org Config

```typescript
async function seedOrgConfig(orgId: string) {
  await db.insert(lmsOrgConfig).values({
    id: createId(),
    orgId,
    allowSelfEnrollment: true,
    requireApprovalForEnrollment: false,
    defaultCurrency: "USD",
    platformFeePercent: "10.00",
    completionThreshold: 80,
    maxQuizAttempts: 3,
    certificateExpiryDays: null,
    inactivityNudgeDays: 14,
    waitlistEnabled: true,
    reviewsEnabled: true,
  }).onConflictDoNothing();
}
```

---

## 20.3 Instructors

```typescript
async function seedInstructors(orgId: string) {
  const rows = [
    { firstName: "Alice", lastName: "Chen", bio: "Expert in React and TypeScript." },
    { firstName: "Bob", lastName: "Patel", bio: "Full-stack engineer with 10y experience." },
  ];

  return Promise.all(rows.map(async (r) => {
    const id = createId();
    await db.insert(lmsInstructors).values({
      id, orgId,
      userId: createId(),
      displayName: `${r.firstName} ${r.lastName}`,
      bio: r.bio,
      status: "active",
    }).onConflictDoNothing();
    return id;
  }));
}
```

---

## 20.4 Categories

```typescript
async function seedCategories(orgId: string) {
  const cats = ["Web Development", "Data Science", "Design", "Business"];
  const ids: Record<string, string> = {};

  for (const name of cats) {
    const id = createId();
    await db.insert(lmsCategories).values({ id, orgId, name, slug: name.toLowerCase().replace(/ /g, "-"), isActive: true }).onConflictDoNothing();
    ids[name] = id;
  }
  return ids;
}
```

---

## 20.5 Courses with Modules and Quizzes

```typescript
async function seedCourses(orgId: string, instructors: string[], categories: Record<string, string>) {
  const courseDefs = [
    {
      title: "React Fundamentals",
      slug: "react-fundamentals",
      categoryId: categories["Web Development"],
      price: "49.00",
      instructorId: instructors[0],
      modules: [
        { title: "JSX and Components", type: "video" as const, durationMinutes: 20 },
        { title: "State and Props", type: "video" as const, durationMinutes: 25 },
        { title: "Hooks Overview", type: "article" as const },
        { title: "Module 1 Quiz", type: "quiz" as const, questions: [
          { question: "What is JSX?", type: "multiple-choice", options: ["HTML", "JS extension", "CSS", "XML"], correctOption: 1 },
          { question: "useState returns?", type: "multiple-choice", options: ["object", "tuple", "array", "promise"], correctOption: 2 },
        ]},
      ],
    },
    {
      title: "TypeScript Basics",
      slug: "typescript-basics",
      categoryId: categories["Web Development"],
      price: "0.00",  // free course
      instructorId: instructors[1],
      modules: [
        { title: "Types and Interfaces", type: "video" as const, durationMinutes: 30 },
        { title: "Generics", type: "video" as const, durationMinutes: 22 },
        { title: "Downloadable Cheat Sheet", type: "download" as const },
      ],
    },
  ];

  const courseIds: string[] = [];

  for (const def of courseDefs) {
    const courseId = createId();
    await db.insert(lmsCourses).values({
      id: courseId, orgId,
      instructorId: def.instructorId,
      categoryId: def.categoryId,
      title: def.title,
      slug: def.slug,
      description: `Learn ${def.title} from scratch.`,
      price: def.price,
      currency: "USD",
      status: "published",
      completionThreshold: 80,
      totalModules: def.modules.length,
    }).onConflictDoNothing();

    let sortOrder = 10;
    for (const mod of def.modules) {
      const moduleId = createId();
      await db.insert(lmsModules).values({
        id: moduleId, courseId,
        title: mod.title,
        type: mod.type,
        sortOrder,
        status: "published",
        isRequired: true,
        durationMinutes: "durationMinutes" in mod ? mod.durationMinutes : null,
      }).onConflictDoNothing();
      sortOrder += 10;

      if (mod.type === "quiz" && "questions" in mod) {
        let qOrder = 1;
        for (const q of mod.questions) {
          await db.insert(lmsQuizQuestions).values({
            id: createId(), moduleId,
            question: q.question,
            type: q.type,
            options: q.options,
            correctOption: q.correctOption,
            points: 1,
            sortOrder: qOrder++,
          }).onConflictDoNothing();
        }
      }
    }
    courseIds.push(courseId);
  }
  return courseIds;
}
```

---

## 20.6 Learners

```typescript
async function seedLearners(orgId: string) {
  const learners = [
    { name: "Carol White", email: "carol@example.com" },
    { name: "Dave Kim", email: "dave@example.com" },
    { name: "Eva Santos", email: "eva@example.com" },
  ];

  return Promise.all(learners.map(async (l) => {
    const id = createId();
    await db.insert(lmsLearners).values({
      id, orgId,
      userId: createId(),
      displayName: l.name,
      email: l.email,
      status: "active",
    }).onConflictDoNothing();
    return id;
  }));
}
```

---

## 20.7 Enrollments with Progress

```typescript
async function seedEnrollments(orgId: string, learners: string[], courses: string[]) {
  // Carol enrolled in React (paid, active), Dave in both, Eva in free TS course
  const enrollments = [
    { learnerId: learners[0], courseId: courses[0], status: "active", completionPct: 60 },
    { learnerId: learners[1], courseId: courses[0], status: "completed", completionPct: 100 },
    { learnerId: learners[1], courseId: courses[1], status: "active", completionPct: 33 },
    { learnerId: learners[2], courseId: courses[1], status: "active", completionPct: 0 },
  ];

  for (const e of enrollments) {
    await db.insert(lmsEnrollments).values({
      id: createId(), orgId,
      learnerId: e.learnerId,
      courseId: e.courseId,
      status: e.status,
      completionPct: e.completionPct,
      enrolledAt: new Date(),
    }).onConflictDoNothing();
  }
}
```

---

## 20.8 Coupons

```typescript
async function seedCoupons(orgId: string, courses: string[]) {
  await db.insert(lmsCoupons).values([
    {
      id: createId(), orgId,
      code: "WELCOME10",
      discountType: "percent",
      discountValue: "10.00",
      maxUses: 100,
      usedCount: 0,
      isActive: true,
      courseIds: null,  // applies to all
    },
    {
      id: createId(), orgId,
      code: "REACT20",
      discountType: "percent",
      discountValue: "20.00",
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

**File:** `packages/lms/src/seed-run.ts`

```typescript
import { seedLms } from "./seed";

const orgId = process.env.SEED_ORG_ID;
if (!orgId) throw new Error("SEED_ORG_ID required");

seedLms(orgId)
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
```

```bash
SEED_ORG_ID=org_xxx bun run packages/lms/src/seed-run.ts
```
