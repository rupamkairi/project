import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { Button } from "@projectx/ui"
import { Loader2 } from "lucide-react"

interface QuizResult {
  score: number
  total: number
  passed: boolean
  answers: Array<{ questionId: string; correct: boolean }>
}

interface QuizModuleProps {
  moduleId: string
  enrollmentId: string
  attemptsUsed: number
  maxAttempts: number
}

export function QuizModule({ moduleId, enrollmentId, attemptsUsed, maxAttempts }: QuizModuleProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [result, setResult] = useState<QuizResult | null>(null)

  const { data: module } = useQuery({
    queryKey: ["module-questions", moduleId],
    queryFn: () => lmsApi.get<any>(`/courses/modules/${moduleId}/questions`),
  })

  const submit = useMutation({
    mutationFn: () =>
      lmsApi.post("/progress/quiz/submit", {
        moduleId,
        enrollmentId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
      }),
    onSuccess: (data: any) => setResult(data),
  })

  const attemptsLeft = maxAttempts - attemptsUsed

  if (result) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="p-6 rounded-lg border text-center">
          <p className="text-3xl font-bold mb-2">
            {result.score}/{result.total}
          </p>
          <p className="text-lg font-medium">
            {result.passed ? "🎉 Passed!" : "❌ Not quite"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {Math.round((result.score / result.total) * 100)}%
          </p>
        </div>
        {attemptsLeft > 0 && !result.passed && (
          <Button variant="outline" onClick={() => setResult(null)}>
            Retry ({attemptsLeft} attempt{attemptsLeft > 1 ? "s" : ""} left)
          </Button>
        )}
        {attemptsLeft === 0 && !result.passed && (
          <p className="text-sm text-red-500">No attempts remaining.</p>
        )}
      </div>
    )
  }

  if (!module?.questions) {
    return <p className="text-sm text-muted-foreground">Loading questions...</p>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="text-sm text-muted-foreground">
        Attempt {attemptsUsed + 1} of {maxAttempts}
      </div>

      {module.questions.map((q: any, i: number) => (
        <div key={q.id} className="space-y-3 p-4 rounded-lg border">
          <p className="font-medium text-sm">
            {i + 1}. {q.question}
          </p>
          <div className="space-y-1.5">
            {(q.options ?? []).map((opt: any, j: number) => (
              <label
                key={j}
                className={cn(
                  "flex items-center gap-2 p-2 rounded border text-sm cursor-pointer",
                  answers[q.id] === opt.value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted",
                )}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={opt.value}
                  checked={answers[q.id] === opt.value}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt.value }))}
                  className="accent-primary"
                />
                {opt.label ?? opt.value}
              </label>
            ))}
          </div>
        </div>
      ))}

      <Button
        onClick={() => submit.mutateAsync()}
        disabled={
          submit.isPending ||
          Object.keys(answers).length < (module.questions?.length ?? 0)
        }
      >
        {submit.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Quiz"
        )}
      </Button>

      {submit.isError && (
        <p className="text-sm text-red-500">
          {(submit.error as any)?.message ?? "Submission failed"}
        </p>
      )}
    </div>
  )
}

import { cn } from "@projectx/ui"
