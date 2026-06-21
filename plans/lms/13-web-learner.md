# Phase 13 — Web: LearnerApp

---

## 13.1 Dashboard Page

Route: `/learn/dashboard`

```tsx
export function LearnerDashboard() {
  const { data: summary } = useQuery({ queryKey: ["learner-analytics"], queryFn: () => lmsApi.get("/learner/analytics") });
  const { data: enrollments } = useQuery({ queryKey: ["enrollments"], queryFn: () => lmsApi.get("/enrollments?status=active") });

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Active Courses" value={summary?.enrollments.active} />
        <StatCard label="Completed" value={summary?.enrollments.completed} />
        <StatCard label="Certificates" value={summary?.certificates} />
        <StatCard label="Hours Spent" value={`${summary?.totalHoursSpent}h`} />
      </div>

      {/* Continue learning */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Continue Learning</h2>
        <div className="space-y-3">
          {enrollments?.filter(e => e.completionPct > 0 && e.completionPct < 100).map(enr => (
            <CourseProgressCard key={enr.id} enrollment={enr} />
          ))}
        </div>
      </section>

      {/* Streak */}
      {summary?.streak.current > 0 && (
        <div className="text-sm text-amber-600">
          🔥 {summary.streak.current}-day streak! Keep it up.
        </div>
      )}
    </div>
  );
}
```

---

## 13.2 Course Catalog Page

Route: `/learn/catalog`

```tsx
export function CatalogPage() {
  const [filters, setFilters] = useState<CatalogFilters>({});
  const { data } = useQuery({
    queryKey: ["catalog", filters],
    queryFn: () => lmsApi.get(`/courses?${buildQueryString(filters)}`),
  });

  return (
    <div className="flex gap-6">
      {/* Sidebar filters */}
      <aside className="w-56 shrink-0">
        <CategoryFilter onSelect={c => setFilters(f => ({ ...f, categoryId: c }))} />
        <LevelFilter onSelect={l => setFilters(f => ({ ...f, level: l }))} />
        <PriceFilter onSelect={p => setFilters(f => ({ ...f, ...p }))} />
      </aside>

      {/* Grid */}
      <div className="flex-1">
        <div className="grid grid-cols-3 gap-4">
          {data?.courses.map(c => <CourseCard key={c.id} course={c} />)}
        </div>
        <Pagination total={data?.total} page={filters.page} onChange={p => setFilters(f => ({ ...f, page: p }))} />
      </div>
    </div>
  );
}
```

---

## 13.3 Module Player Page

Route: `/learn/courses/:slug/modules/:moduleId`

The most important page — where learning happens.

```tsx
export function ModulePlayerPage() {
  const { slug, moduleId } = useParams();
  const { enrollment, module, progress } = useModuleAccess(slug, moduleId);

  // Heartbeat for video
  const { startHeartbeat, stopHeartbeat } = useVideoHeartbeat(enrollment.id, moduleId);

  return (
    <div className="flex h-screen">
      {/* Module sidebar */}
      <ModuleSidebar courseSlug={slug} currentModuleId={moduleId} enrollmentId={enrollment.id} />

      {/* Content area */}
      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-semibold mb-4">{module.title}</h1>

        {module.type === "video" && (
          <VideoPlayer
            src={module.contentRef}
            initialProgress={progress?.progressPct ?? 0}
            onTimeUpdate={(pct) => startHeartbeat(pct)}
            onEnded={() => { stopHeartbeat(); tryCompleteModule(moduleId); }}
          />
        )}

        {module.type === "article" && <ArticleContent url={module.contentRef} />}

        {module.type === "quiz" && (
          <QuizModule
            moduleId={moduleId}
            enrollmentId={enrollment.id}
            attemptsUsed={progress?.quizAttempts ?? 0}
            maxAttempts={orgConfig.maxQuizAttempts}
          />
        )}

        {module.type === "download" && <DownloadModule docId={module.contentDocId} />}
      </main>
    </div>
  );
}
```

**Module sidebar** shows:
- All modules with lock icon if `requiredPrevious` and previous not completed
- Current progress dot for each module
- Completed checkmark (green)

---

## 13.4 Quiz Module Component

```tsx
export function QuizModule({ moduleId, enrollmentId, attemptsUsed, maxAttempts }) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const submit = useMutation({ mutationFn: () => lmsApi.post("/progress/quiz/submit", { moduleId, enrollmentId, answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })) }) });
  const attemptsLeft = maxAttempts - attemptsUsed;

  if (result) {
    return <QuizResult result={result} onRetry={attemptsLeft > 0 ? () => setResult(null) : undefined} />;
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Attempt {attemptsUsed + 1} of {maxAttempts}
      </div>
      <QuestionList questions={questions} answers={answers} onChange={setAnswers} />
      <Button
        onClick={() => submit.mutateAsync().then(setResult)}
        disabled={submit.isPending || Object.keys(answers).length < questions.length}
      >
        Submit Quiz
      </Button>
    </div>
  );
}
```

---

## 13.5 My Certificates Page

Route: `/learn/certificates`

```tsx
export function CertificatesPage() {
  const { data } = useQuery({ queryKey: ["certificates"], queryFn: () => lmsApi.get("/learner/certificates") });

  return (
    <div className="space-y-4">
      {data?.certificates.map(cert => (
        <div key={cert.id} className="border rounded-lg p-4 flex items-start justify-between">
          <div>
            <p className="font-medium">{cert.courseTitle}</p>
            <p className="text-sm text-muted-foreground">Issued {format(cert.issuedAt)}</p>
            {cert.expiresAt && (
              <p className={cn("text-xs", cert.isExpired ? "text-red-500" : "text-muted-foreground")}>
                {cert.isExpired ? "Expired" : `Expires ${format(cert.expiresAt)}`}
              </p>
            )}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{cert.verificationCode}</code>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href={cert.documentUrl} download>Download PDF</a>
            </Button>
            <Button size="sm" variant="outline" onClick={() => copyLink(cert.verifyUrl)}>
              Copy Link
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```
