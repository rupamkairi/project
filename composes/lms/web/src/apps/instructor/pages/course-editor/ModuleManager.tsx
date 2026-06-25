import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { lmsApi } from "../../../../api/lms-client"
import { Button, Input, Label, Switch, cn } from "@projectx/ui"
import { Plus, GripVertical, Pencil, Trash2, Loader2 } from "lucide-react"
import { ModuleIcon } from "../../../../components/shared/ModuleIcon"

interface Props {
  courseId: string
}

export function ModuleManager({ courseId }: Props) {
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [newType, setNewType] = useState("video")
  const [newEstimatedMinutes, setNewEstimatedMinutes] = useState("10")

  const { data, refetch } = useQuery({
    queryKey: ["instructor-course", courseId],
    queryFn: () => lmsApi.get<any>(`/instructor/courses/${courseId}`),
    select: (d: any) => d?.modules ?? [],
  })

  const modules = data ?? []

  const createModule = useMutation({
    mutationFn: () =>
      lmsApi.post(`/instructor/courses/${courseId}/modules`, {
        title: newTitle,
        type: newType,
        estimatedMinutes: parseInt(newEstimatedMinutes) || 10,
      }),
    onSuccess: () => {
      setCreating(false)
      setNewTitle("")
      setNewType("video")
      refetch()
    },
  })

  const deleteModule = useMutation({
    mutationFn: (moduleId: string) =>
      lmsApi.delete(`/instructor/courses/${courseId}/modules/${moduleId}`),
    onSuccess: () => refetch(),
  })

  const togglePublish = useMutation({
    mutationFn: ({ moduleId, isPublished }: { moduleId: string; isPublished: boolean }) =>
      lmsApi.patch(`/instructor/courses/${courseId}/modules/${moduleId}`, {
        isPublished,
      }),
    onSuccess: () => refetch(),
  })

  const toggleLock = useMutation({
    mutationFn: ({ moduleId, requiredPrevious }: { moduleId: string; requiredPrevious: boolean }) =>
      lmsApi.patch(`/instructor/courses/${courseId}/modules/${moduleId}`, {
        requiredPrevious,
      }),
    onSuccess: () => refetch(),
  })

  const toggleFree = useMutation({
    mutationFn: ({ moduleId, isFree }: { moduleId: string; isFree: boolean }) =>
      lmsApi.patch(`/instructor/courses/${courseId}/modules/${moduleId}`, {
        isFree,
      }),
    onSuccess: () => refetch(),
  })

  return (
    <div className="space-y-2 max-w-xl">
      {modules.length === 0 && !creating && (
        <p className="text-sm text-muted-foreground py-4">No modules yet. Add your first module.</p>
      )}

      {modules.map((m: any, i: number) => (
        <div
          key={m.id}
          className="flex items-center gap-3 p-3 rounded border bg-background"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
          <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
          <ModuleIcon type={m.type} />
          <span className="flex-1 text-sm truncate">{m.title}</span>
          <span className="text-xs text-muted-foreground">
            {m.estimatedMinutes}min
          </span>
          <Switch
            checked={m.isPublished ?? false}
            onCheckedChange={(v) => togglePublish.mutate({ moduleId: m.id, isPublished: v })}
            className="scale-75"
          />
          <Switch
            checked={m.requiredPrevious ?? false}
            onCheckedChange={(v) => toggleLock.mutate({ moduleId: m.id, requiredPrevious: v })}
            className="scale-75"
          />
          <Switch
            checked={m.isFree ?? false}
            onCheckedChange={(v) => toggleFree.mutate({ moduleId: m.id, isFree: v })}
            className="scale-75"
          />
          <button
            onClick={() => deleteModule.mutate(m.id)}
            className="text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {creating ? (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-title">Module Title</Label>
            <Input
              id="new-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Introduction"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-type">Type</Label>
              <select
                id="new-type"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
                <option value="download">Download</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-minutes">Est. Minutes</Label>
              <Input
                id="new-minutes"
                type="number"
                value={newEstimatedMinutes}
                onChange={(e) => setNewEstimatedMinutes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => createModule.mutate()}
              disabled={createModule.isPending || !newTitle.trim()}
            >
              {createModule.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add Module"
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreating(true)}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Module
        </Button>
      )}
    </div>
  )
}
