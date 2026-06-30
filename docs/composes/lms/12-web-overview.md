# Phase 12 — Web Overview

---

## 12.1 Three Web Apps

| App | Path prefix | Users |
|-----|-------------|-------|
| LearnerApp | `/learn` | Enrolled learners |
| InstructorApp | `/teach` | Course instructors |
| AdminApp | `/lms-admin` | LMS administrators |

---

## 12.2 Pain Points This UI Solves

| Pain | Solution |
|------|---------|
| Learner loses progress after tab close | Heartbeat + progress persisted per module |
| Instructor has no view of who's stuck | Dropoff funnel per module in analytics |
| Certificate link goes to 404 | Public `/lms/verify/:code` always resolves |
| Quiz retried infinitely | Attempt counter shown + disabled submit on limit |
| Sequential modules unlocked too early | Lock icon + disabled state on inaccessible modules |
| Enrollment payment double-submit | Disable button after first click; idempotency on server |

---

## 12.3 Role → App Access

| Role | App | Notes |
|------|-----|-------|
| `learner` | LearnerApp | Own enrollments only |
| `instructor` | InstructorApp | Own courses only |
| `content-reviewer` | AdminApp (review queue) | Course approval only |
| `lms-admin` | AdminApp (full) | All courses, all enrollments |

---

## 12.4 Design Rules

- Shadcn zinc palette + compact variants
- No brand logos in component library (org-specific theming via CSS vars)
- Status badge color codes:

| Status | Color |
|--------|-------|
| `published` / `active` / `completed` | green |
| `under-review` / `pending-payment` | amber |
| `draft` | zinc/muted |
| `rejected` / `cancelled` / `expired` | red |
| `archived` | slate |

- Progress bars: `bg-primary` fill, `bg-muted` track
- Course thumbnails: 16:9 aspect ratio, `object-cover`
- Dates: `DD MMM YYYY` format (e.g. 21 Jun 2026)
- Prices: `Intl.NumberFormat` with currency

---

## 12.5 File Tree

```
packages/lms-web/src/
  index.ts
  api/
    lms-client.ts
  stores/
    auth-store.ts
    enrollment-store.ts
  components/shared/
    StatusBadge.tsx
    ProgressBar.tsx
    CourseCard.tsx
    ModuleIcon.tsx
    PriceDisplay.tsx
    ConfirmDialog.tsx
    LmsLayout.tsx
    LmsSidebar.tsx
  apps/
    learner/
      index.ts
      routes.tsx
      pages/
        dashboard/
        catalog/
        my-courses/
        course-detail/
        module-player/
        certificates/
        profile/
    instructor/
      index.ts
      routes.tsx
      pages/
        dashboard/
        courses/
        course-editor/
        analytics/
        students/
    admin/
      index.ts
      routes.tsx
      pages/
        dashboard/
        courses/
        enrollments/
        instructors/
        certificates/
        config/
```

---

## 12.6 Shared API Client

**File:** `packages/lms-web/src/api/lms-client.ts`

```typescript
export class LmsApiClient {
  private base = "/lms";

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { redirectToLogin(); throw new Error("Unauthorized"); }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(res.status, err.message ?? "Request failed", err.code);
    }
    return res.json();
  }

  get = <T>(path: string) => this.request<T>("GET", path);
  post = <T>(path: string, body?: unknown) => this.request<T>("POST", path, body);
  patch = <T>(path: string, body?: unknown) => this.request<T>("PATCH", path, body);
  delete = <T>(path: string) => this.request<T>("DELETE", path);
}

export const lmsApi = new LmsApiClient();
```
