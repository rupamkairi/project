# Phase 19 — Web: Shared Foundation

---

## 19.1 Auth Store

**File:** `packages/lms-web/src/stores/auth-store.ts`

```typescript
import { create } from "zustand";

interface LmsAuthState {
  actor: { id: string; name: string; email: string; role: string } | null;
  permissions: string[];
  setActor: (actor: LmsAuthState["actor"], permissions: string[]) => void;
  hasPermission: (perm: string) => boolean;
  clear: () => void;
}

export const useLmsAuthStore = create<LmsAuthState>((set, get) => ({
  actor: null,
  permissions: [],
  setActor: (actor, permissions) => set({ actor, permissions }),
  hasPermission: (perm) => {
    const { permissions } = get();
    return permissions.includes("lms:admin") || permissions.includes(perm);
  },
  clear: () => set({ actor: null, permissions: [] }),
}));
```

---

## 19.2 LMS Layout Component

**File:** `packages/lms-web/src/components/shared/LmsLayout.tsx`

```tsx
export function LmsLayout({ app, children }: { app: "learner" | "instructor" | "admin"; children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <LmsSidebar app={app} />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
```

---

## 19.3 Sidebar per App

```tsx
const NAV_BY_APP = {
  learner: [
    { href: "/learn/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/learn/catalog", label: "Catalog", icon: BookOpen },
    { href: "/learn/my-courses", label: "My Courses", icon: GraduationCap },
    { href: "/learn/certificates", label: "Certificates", icon: Award },
  ],
  instructor: [
    { href: "/teach/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teach/courses", label: "My Courses", icon: BookOpen },
    { href: "/teach/analytics", label: "Analytics", icon: BarChart2 },
  ],
  admin: [
    { href: "/lms-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/lms-admin/courses", label: "Courses", icon: BookOpen },
    { href: "/lms-admin/enrollments", label: "Enrollments", icon: Users },
    { href: "/lms-admin/instructors", label: "Instructors", icon: UserCheck },
    { href: "/lms-admin/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/lms-admin/coupons", label: "Coupons", icon: Tag },
    { href: "/lms-admin/config", label: "Settings", icon: Settings },
  ],
};
```

---

## 19.4 Shared Components

**CourseCard:**
```tsx
export function CourseCard({ course }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="aspect-video bg-muted overflow-hidden">
        {course.thumbnailUrl
          ? <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>
        }
      </div>
      <CardContent className="p-4 space-y-2">
        <p className="font-medium line-clamp-2">{course.title}</p>
        <p className="text-xs text-muted-foreground">{course.instructorName}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-amber-500">★</span>
            <span>{course.rating || "—"}</span>
            <span className="text-muted-foreground">({course.reviewCount})</span>
          </div>
          <PriceDisplay amount={course.price} currency={course.currency} />
        </div>
      </CardContent>
    </Card>
  );
}
```

**ProgressBar:**
```tsx
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
```

**StatusBadge:**
```tsx
const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  "under-review": "bg-amber-100 text-amber-700",
  "pending-payment": "bg-amber-100 text-amber-700",
  draft: "bg-zinc-100 text-zinc-600",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-red-100 text-red-700",
  archived: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-zinc-100 text-zinc-600";
  return <span className={cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize", cls)}>{status.replace(/-/g, " ")}</span>;
}
```

---

## 19.5 LMS API Client

**File:** `packages/lms-web/src/api/lms-client.ts`

```typescript
export class LmsApiClient {
  constructor(private base: string) {}

  private request(path: string, opts?: RequestInit) {
    return fetch(`${this.base}${path}`, opts).then(r => r.json());
  }

  // Master table reads — routed through mediator on the server side
  getCourses(params?: Record<string, string>) {
    return this.request("/lms/courses?" + new URLSearchParams(params));
  }  // → catalog.listItems type=course

  getStudents(params?: Record<string, string>) {
    return this.request("/lms/students?" + new URLSearchParams(params));
  }  // → party.listPersons type=student

  getInstructors(params?: Record<string, string>) {
    return this.request("/lms/instructors?" + new URLSearchParams(params));
  }  // → party.listPersons type=instructor

  getEnrollments(params?: Record<string, string>) {
    return this.request("/lms/enrollments?" + new URLSearchParams(params));
  }  // → transactions type=order

  getLiveSessions(params?: Record<string, string>) {
    return this.request("/lms/live-sessions?" + new URLSearchParams(params));
  }  // → activities type=meeting

  // Detail table reads — direct Drizzle on lms_ tables
  getCourseDetail(itemId: string) {
    return this.request(`/lms/courses/${itemId}/detail`);
  }  // lms_course_detail + lms_modules + lms_lessons

  getProgress(lessonId: string) {
    return this.request(`/lms/lessons/${lessonId}/progress`);
  }  // lms_progress

  getCertificates(params?: Record<string, string>) {
    return this.request("/lms/certificates?" + new URLSearchParams(params));
  }  // lms_certificates

  // Mutations
  createEnrollment(body: { courseId: string; cohortId?: string; couponCode?: string }) {
    return this.request("/lms/enrollments", { method: "POST", body: JSON.stringify(body) });
  }

  markLessonComplete(lessonId: string) {
    return this.request(`/lms/lessons/${lessonId}/complete`, { method: "POST" });
  }
}
```

Pages use `useState` + `useEffect` (or React Query) against this client. Course progress page reads `lms_progress`. Certificate page reads `lms_certificates`.

---

## 19.6 React Query Setup

**File:** `packages/lms-web/src/index.ts`

```typescript
export { LearnerApp } from "./apps/learner";
export { InstructorApp } from "./apps/instructor";
export { LmsAdminApp } from "./apps/admin";

// Re-export shared query client config
export { queryClient } from "./lib/query-client";
```

Each app wraps in `<QueryClientProvider client={queryClient}>`.
