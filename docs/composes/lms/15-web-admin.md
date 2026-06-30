# Phase 15 — Web: AdminApp

---

## 15.1 Admin Dashboard

Route: `/lms-admin/dashboard`

```tsx
export function LmsAdminDashboard() {
  const { data } = useQuery({ queryKey: ["lms-admin-overview"], queryFn: () => lmsApi.get("/admin/analytics/overview") });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Published Courses" value={data?.courses.published} />
        <StatCard label="Active Learners" value={data?.enrollments.active} />
        <StatCard label="Completion Rate" value={`${data?.enrollments.completionRate}%`} />
        <StatCard label="Revenue (MTD)" value={<AmountDisplay amount={data?.revenue.periodRevenue} />} />
      </div>

      {/* Courses under review */}
      {data?.courses.underReview > 0 && (
        <Alert>
          <AlertDescription>
            {data.courses.underReview} course{data.courses.underReview > 1 ? "s" : ""} awaiting review.
            <Button variant="link" onClick={() => navigate("/lms-admin/courses?status=under-review")}>Review now</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-6">
        <RevenueChart data={data?.enrollmentsByDay} />
        <TopCoursesTable courses={data?.topCourses} />
      </div>
    </div>
  );
}
```

---

## 15.2 Course Review Queue

Route: `/lms-admin/courses`

Filter: `status=under-review` by default for admin reviewers.

```tsx
export function AdminCoursesPage() {
  const [status, setStatus] = useSearchParam("status");
  const { data } = useQuery({ queryKey: ["admin-courses", status], queryFn: () => lmsApi.get(`/admin/courses?status=${status ?? ""}`) });

  return (
    <DataTable
      columns={[
        { accessorKey: "title", header: "Title" },
        { accessorKey: "instructorName", header: "Instructor" },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        { accessorKey: "moduleCount", header: "Modules" },
        { accessorKey: "submittedAt", header: "Submitted", cell: ({ row }) => formatDate(row.original.updatedAt) },
        { id: "actions", cell: ({ row }) => row.original.status === "under-review" ? (
          <div className="flex gap-2">
            <Button size="sm" className="bg-green-600" onClick={() => approveDialog.open(row.original.id)}>Approve</Button>
            <Button size="sm" variant="destructive" onClick={() => rejectDialog.open(row.original.id)}>Reject</Button>
          </div>
        ) : null },
      ]}
      data={data?.courses ?? []}
    />
  );
}
```

**Approve dialog**: confirms and publishes. No extra input.
**Reject dialog**: requires `reason` text field. Sends reason to instructor.

---

## 15.3 Enrollments Page

Route: `/lms-admin/enrollments`

```tsx
export function AdminEnrollmentsPage() {
  const { data } = useQuery({ queryKey: ["admin-enrollments"], queryFn: () => lmsApi.get("/admin/enrollments") });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">Enrollments</h1>
        <BulkEnrollDialog />
      </div>

      <DataTable
        columns={[
          { accessorKey: "learnerName", header: "Learner" },
          { accessorKey: "courseTitle", header: "Course" },
          { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
          { accessorKey: "completionPct", header: "Progress",
            cell: ({ row }) => <Progress value={row.original.completionPct} className="w-24" /> },
          { accessorKey: "pricePaid", header: "Paid",
            cell: ({ row }) => <AmountDisplay amount={row.original.pricePaid} /> },
          { accessorKey: "createdAt", header: "Enrolled", cell: ({ row }) => formatDate(row.original.createdAt) },
          { id: "actions", cell: ({ row }) => (
            <DropdownMenu>
              {["pending-payment", "active"].includes(row.original.status) && (
                <DropdownMenuItem onClick={() => cancelEnrollment(row.original.id)}>Cancel</DropdownMenuItem>
              )}
              {row.original.status === "completed" && !row.original.certificateId && (
                <DropdownMenuItem onClick={() => reissueCertificate(row.original.id)}>Issue Certificate</DropdownMenuItem>
              )}
            </DropdownMenu>
          )},
        ]}
        data={data?.enrollments ?? []}
      />
    </div>
  );
}
```

---

## 15.4 Instructors Page

Route: `/lms-admin/instructors`

```tsx
export function AdminInstructorsPage() {
  return (
    <DataTable
      columns={[
        { accessorKey: "name", header: "Name" },
        { accessorKey: "email", header: "Email" },
        { accessorKey: "courseCount", header: "Courses" },
        { accessorKey: "totalEnrollments", header: "Total Enrollments" },
        { accessorKey: "avgRating", header: "Avg Rating" },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
        { id: "actions", cell: ({ row }) => (
          <Button size="sm" variant="ghost" onClick={() => navigate(`/lms-admin/instructors/${row.original.id}`)}>View</Button>
        )},
      ]}
    />
  );
}
```

---

## 15.5 Org Config Page

Route: `/lms-admin/config`

```tsx
export function LmsConfigPage() {
  const { data: config } = useQuery({ queryKey: ["lms-config"], queryFn: () => lmsApi.get("/admin/config") });
  const update = useMutation({ mutationFn: (data: Partial<LmsOrgConfig>) => lmsApi.patch("/admin/config", data) });

  return (
    <Form onSubmit={data => update.mutateAsync(data)}>
      <FormField label="Completion Threshold %" name="defaultCompletionThreshold" defaultValue={config?.defaultCompletionThreshold} />
      <FormField label="Refund Window (days)" name="refundWindowDays" defaultValue={config?.refundWindowDays} />
      <FormField label="Inactivity Nudge (days)" name="inactivityNudgeDays" defaultValue={config?.inactivityNudgeDays} />
      <FormField label="Max Quiz Attempts" name="maxQuizAttempts" defaultValue={config?.maxQuizAttempts} />
      <FormField label="Certificate Expiry (days, blank = never)" name="certificateExpiresAfterDays" defaultValue={config?.certificateExpiresAfterDays} />
      <Button type="submit">Save Config</Button>
    </Form>
  );
}
```
