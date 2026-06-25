import { useState, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { Button, Input, Label, Textarea } from "@projectx/ui"
import { Loader2 } from "lucide-react"

interface Props {
  course: any
  courseId: string
  onUpdate?: () => void
}

export function CourseDetailsForm({ course, courseId, onUpdate }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [level, setLevel] = useState("beginner")
  const [language, setLanguage] = useState("en")

  useEffect(() => {
    if (course) {
      setTitle(course.title ?? "")
      setDescription(course.description ?? "")
      setLevel(course.level ?? "beginner")
      setLanguage(course.language ?? "en")
    }
  }, [course])

  const update = useMutation({
    mutationFn: () =>
      lmsApi.patch(`/instructor/courses/${courseId}`, {
        title,
        description,
        level,
        language,
      }),
    onSuccess: () => onUpdate?.(),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        update.mutate()
      }}
      className="space-y-4 max-w-xl"
    >
      <div className="space-y-1.5">
        <Label htmlFor="edit-title">Title</Label>
        <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-desc">Description</Label>
        <Textarea
          id="edit-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-level">Level</Label>
          <select
            id="edit-level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="all-levels">All Levels</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-lang">Language</Label>
          <select
            id="edit-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
      </div>

      {update.isSuccess && <p className="text-sm text-green-600">Details saved</p>}
      {update.isError && (
        <p className="text-sm text-red-500">{(update.error as any)?.message ?? "Save failed"}</p>
      )}

      <Button type="submit" disabled={update.isPending}>
        {update.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Details"
        )}
      </Button>
    </form>
  )
}
