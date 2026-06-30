import { useParams } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { cn } from "@projectx/ui"
import { ModuleIcon } from "../../../../components/shared/ModuleIcon"
import { QuizModule } from "./QuizModule"

const typeIcon: Record<string, string> = {
  video: "▶",
  article: "📄",
  quiz: "✏",
  assignment: "📋",
  "live-session": "🎥",
  download: "⬇",
}

export function ModulePlayerPage() {
  const { slug, moduleId } = useParams({
    from: "/lms/learn/courses/$slug/modules/$moduleId",
  })

  const { data: module } = useQuery({
    queryKey: ["module", slug, moduleId],
    queryFn: () => lmsApi.get<any>(`/courses/${slug}/modules/${moduleId}`),
  })

  const { data: course } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => lmsApi.get<any>(`/courses/${slug}`),
  })

  const modules = course?.modules ?? []
  const currentIndex = modules.findIndex((m: any) => m.id === moduleId)

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <aside className="w-64 border-r overflow-y-auto shrink-0 bg-muted/20">
        <div className="p-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            {course?.title ?? "Course"}
          </h3>
          <div className="space-y-1">
            {modules.map((m: any, i: number) => {
              const isCurrent = m.id === moduleId
              const isCompleted = m.completionPct === 100
              const isLocked = m.requiredPrevious && i > 0 && !modules[i - 1]?.completionPct

              return (
                <a
                  key={m.id}
                  href={`/lms/learn/courses/${slug}/modules/${m.id}`}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors",
                    isCurrent
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-muted-foreground",
                    isLocked && "opacity-50 pointer-events-none",
                  )}
                >
                  <span className="shrink-0 w-4 text-center">
                    {isCompleted ? "✓" : isLocked ? "🔒" : typeIcon[m.type] ?? "📄"}
                  </span>
                  <span className="truncate flex-1">{m.title}</span>
                  {m.estimatedMinutes && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {m.estimatedMinutes}min
                    </span>
                  )}
                </a>
              )
            })}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <span>
              Module {currentIndex + 1} of {modules.length}
            </span>
            {module?.estimatedMinutes && (
              <>
                <span>·</span>
                <span>{module.estimatedMinutes} min</span>
              </>
            )}
          </div>

          <h1 className="text-xl font-semibold mb-6">{module?.title}</h1>

          {module?.description && (
            <p className="text-sm text-muted-foreground mb-6">
              {module.description}
            </p>
          )}

          {module?.type === "video" && module?.contentUrl && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-6">
              <video src={module.contentUrl} controls className="w-full h-full" />
            </div>
          )}

          {module?.type === "article" && module?.contentBody && (
            <div
              className="prose prose-sm max-w-none mb-6"
              dangerouslySetInnerHTML={{ __html: module.contentBody }}
            />
          )}

          {module?.type === "quiz" && (
            <QuizModule
              moduleId={moduleId}
              enrollmentId={""} // Will be resolved from enrollment store
              attemptsUsed={module?.quizAttempts ?? 0}
              maxAttempts={3}
            />
          )}

          {module?.type === "download" && module?.contentUrl && (
            <a
              href={module.contentUrl}
              download
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6"
            >
              ⬇ Download materials
            </a>
          )}

          <div className="flex items-center justify-between mt-8 pt-4 border-t">
            <div>
              {currentIndex > 0 && (
                <a
                  href={`/lms/learn/courses/${slug}/modules/${modules[currentIndex - 1].id}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Previous
                </a>
              )}
            </div>
            <div>
              {currentIndex < modules.length - 1 && (
                <a
                  href={`/lms/learn/courses/${slug}/modules/${modules[currentIndex + 1].id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Next →
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
