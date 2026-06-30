# Phase 14 — Web: InstructorApp

---

## 14.1 Instructor Dashboard

Route: `/teach/dashboard`

```tsx
export function InstructorDashboard() {
  const { data } = useQuery({ queryKey: ["instructor-analytics"], queryFn: () => lmsApi.get("/instructor/analytics/overview") });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Published Courses" value={data?.courses.published} />
        <StatCard label="Total Enrollments" value={data?.enrollments.total} />
        <StatCard label="Completion Rate" value={`${data?.enrollments.completionRate}%`} />
        <StatCard label="Revenue (MTD)" value={<AmountDisplay amount={data?.revenue.periodRevenue} />} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ReviewsCard latestReviews={data?.latestReviews} avgRating={data?.avgRating} />
        <PendingSubmissionsCard />
      </div>
    </div>
  );
}
```

---

## 14.2 Course List Page

Route: `/teach/courses`

```tsx
export function InstructorCoursesPage() {
  const { data } = useQuery({ queryKey: ["instructor-courses"], queryFn: () => lmsApi.get("/instructor/courses") });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">My Courses</h1>
        <Button onClick={() => navigate("/teach/courses/new")}>New Course</Button>
      </div>

      <DataTable
        columns={[
          { accessorKey: "title", header: "Title" },
          { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
          { accessorKey: "enrolledCount", header: "Enrolled" },
          { accessorKey: "rating", header: "Rating",
            cell: ({ row }) => row.original.rating > 0 ? `★ ${row.original.rating}` : "—" },
          { id: "actions", cell: ({ row }) => (
            <DropdownMenu>
              <DropdownMenuItem onClick={() => navigate(`/teach/courses/${row.original.id}/edit`)}>Edit</DropdownMenuItem>
              {row.original.status === "draft" && (
                <DropdownMenuItem onClick={() => submitForReview(row.original.id)}>Submit for Review</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate(`/teach/courses/${row.original.id}/analytics`)}>Analytics</DropdownMenuItem>
            </DropdownMenu>
          )},
        ]}
        data={data?.courses ?? []}
      />
    </div>
  );
}
```

---

## 14.3 Course Editor Page

Route: `/teach/courses/:id/edit`

Tabs: Details | Modules | Pricing | Cohorts | Settings

```tsx
export function CourseEditorPage() {
  const { id } = useParams();
  const { data: course } = useCourse(id);

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h1 className="text-xl font-semibold">{course?.title}</h1>
        <div className="flex gap-2">
          <StatusBadge status={course?.status} />
          {course?.status === "draft" && (
            <Button onClick={() => submitForReview(id)}>Submit for Review</Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="modules">Modules ({course?.moduleCount})</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
        </TabsList>

        <TabsContent value="details"><CourseDetailsForm course={course} courseId={id} /></TabsContent>
        <TabsContent value="modules"><ModuleManager courseId={id} /></TabsContent>
        <TabsContent value="pricing"><PricingForm course={course} courseId={id} /></TabsContent>
        <TabsContent value="cohorts"><CohortManager courseId={id} /></TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 14.4 Module Manager Component

Drag-and-drop reordering. Inline create/edit.

```tsx
export function ModuleManager({ courseId }) {
  const { data: modules } = useModules(courseId);
  const reorder = useMutation({ mutationFn: (ids: string[]) => lmsApi.post(`/instructor/courses/${courseId}/modules/reorder`, { moduleIds: ids }) });

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={modules?.map(m => m.id) ?? []}>
        <div className="space-y-2">
          {modules?.map(m => (
            <SortableModuleRow key={m.id} module={m} courseId={courseId} />
          ))}
        </div>
      </SortableContext>
      <Button variant="outline" size="sm" onClick={() => openCreateModuleDialog()}>
        + Add Module
      </Button>
    </DndContext>
  );
}
```

Each module row shows: drag handle, type icon, title, published toggle, lock toggle (`requiredPrevious`), free toggle, edit/delete buttons.

---

## 14.5 Course Analytics Page

Route: `/teach/courses/:id/analytics`

```tsx
export function CourseAnalyticsPage() {
  const { id } = useParams();
  const { data } = useQuery({ queryKey: ["course-analytics", id], queryFn: () => lmsApi.get(`/instructor/analytics/courses/${id}`) });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Enrolled" value={data?.enrollments.total} />
        <StatCard label="Completed" value={data?.enrollments.completed} />
        <StatCard label="Avg Score" value={`${data?.enrollments.avgCompletionPct}%`} />
        <StatCard label="Rating" value={`★ ${data?.reviews.avgRating}`} />
      </div>

      {/* Module dropoff funnel */}
      <Card>
        <CardHeader><CardTitle>Module Completion Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data?.modules.map(m => (
              <div key={m.moduleId} className="flex items-center gap-3">
                <span className="text-sm w-48 truncate">{m.title}</span>
                <Progress value={m.completionRate} className="flex-1" />
                <span className="text-sm text-muted-foreground w-12 text-right">{m.completionRate}%</span>
                {m.dropoffRate > 30 && (
                  <span className="text-xs text-red-500">High dropoff</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```
