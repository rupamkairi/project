# Phase 14 — Web: HousekeepingApp

---

## 14.1 Housekeeping Board (Supervisor View)

Route: `/housekeeping/board`

```tsx
export function HousekeepingBoardPage() {
  const { data, refetch } = useQuery({
    queryKey: ["hk-board"],
    queryFn: () => hspApi.get("/housekeeping/board"),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Pending" value={data?.byStatus.pending.length} />
        <StatCard label="In Progress" value={data?.byStatus.inProgress.length} />
        <StatCard label="Done (Pending Inspect)" value={data?.byStatus.done.length} />
        <StatCard label="Blocked Rooms" value={data?.blockedRooms.length} color="red" />
      </div>

      {/* Staff load */}
      <StaffLoadTable staffLoad={data?.staffLoad} />

      {/* Tasks by status */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({data?.byStatus.pending.length})</TabsTrigger>
          <TabsTrigger value="inProgress">In Progress ({data?.byStatus.inProgress.length})</TabsTrigger>
          <TabsTrigger value="done">Ready to Inspect ({data?.byStatus.done.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <TaskList tasks={data?.byStatus.pending} showAssign onAssign={assignTask} />
        </TabsContent>
        <TabsContent value="inProgress">
          <TaskList tasks={data?.byStatus.inProgress} />
        </TabsContent>
        <TabsContent value="done">
          <TaskList tasks={data?.byStatus.done} showInspect onInspect={inspectTask} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 14.2 Task Card Component

```tsx
function TaskCard({ task, showAssign, showInspect, onAssign, onInspect }) {
  const priorityColor = {
    urgent: "border-l-4 border-l-red-500",
    high: "border-l-4 border-l-amber-500",
    normal: "border-l-4 border-l-zinc-300",
  }[task.priority];

  return (
    <div className={cn("rounded-lg border p-4", priorityColor)}>
      <div className="flex justify-between">
        <div>
          <p className="font-medium">Room {task.roomNumber}</p>
          <p className="text-sm text-muted-foreground capitalize">{task.type.replace("-", " ")}</p>
          {task.assignedTo && <p className="text-xs text-muted-foreground">Assigned: {task.assignedStaff?.name}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={task.status} />
          {task.priority === "rush" && <Badge variant="destructive">RUSH</Badge>}
        </div>
      </div>

      {showAssign && (
        <div className="mt-3 flex gap-2">
          <StaffPicker onSelect={staffId => onAssign(task.id, staffId)} />
        </div>
      )}

      {showInspect && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="bg-green-600" onClick={() => onInspect(task.id, true)}>Pass</Button>
          <Button size="sm" variant="outline" onClick={() => onInspect(task.id, false)}>Fail</Button>
        </div>
      )}
    </div>
  );
}
```

---

## 14.3 My Tasks Page (Housekeeper View)

Route: `/housekeeping/my-tasks`

Housekeeper sees only their assigned tasks, sorted by priority and room floor.

```tsx
export function MyTasksPage() {
  const { data } = useQuery({ queryKey: ["my-tasks"], queryFn: () => hspApi.get("/housekeeping/tasks?assignedToMe=true") });

  return (
    <div className="space-y-3">
      {data?.tasks.map(task => (
        <MyTaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

function MyTaskCard({ task }) {
  const startTask = useMutation({ mutationFn: () => hspApi.post(`/housekeeping/tasks/${task.id}/start`) });
  const completeTask = useMutation({ mutationFn: (results: Record<string, boolean>) =>
    hspApi.post(`/housekeeping/tasks/${task.id}/done`, { checklistResults: results }) });

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between">
        <div>
          <p className="font-medium">Room {task.roomNumber} — Floor {task.floor}</p>
          <p className="text-sm text-muted-foreground capitalize">{task.type.replace("-", " ")}</p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {task.status === "assigned" && (
        <Button className="w-full" onClick={() => startTask.mutateAsync()}>Start Task</Button>
      )}

      {task.status === "in-progress" && (
        <TaskChecklist template={task.type} onComplete={(results) => completeTask.mutateAsync(results)} />
      )}
    </div>
  );
}
```

---

## 14.4 Task Checklist Component

```tsx
export function TaskChecklist({ template, onComplete }) {
  const items = CHECKLIST_TEMPLATES[template] ?? [];
  const [checks, setChecks] = useState<Record<string, boolean>>(Object.fromEntries(items.map(i => [i, false])));
  const allDone = Object.values(checks).every(Boolean);

  return (
    <div className="space-y-2">
      {items.map(item => (
        <label key={item} className="flex items-center gap-3 cursor-pointer">
          <Checkbox
            checked={checks[item]}
            onCheckedChange={v => setChecks(c => ({ ...c, [item]: v as boolean }))}
          />
          <span className="text-sm capitalize">{item.replace("_", " ")}</span>
        </label>
      ))}
      <Button className="w-full mt-3" disabled={!allDone} onClick={() => onComplete(checks)}>
        Mark Done
      </Button>
      {!allDone && <p className="text-xs text-muted-foreground text-center">Complete all items to mark done</p>}
    </div>
  );
}

const CHECKLIST_TEMPLATES: Record<string, string[]> = {
  "departure-clean": ["fresh_linen", "bathroom_cleaned", "minibar_restocked", "trash_emptied", "floor_vacuumed"],
  "stay-over": ["towel_refresh", "trash_emptied", "bed_made"],
  "turndown": ["bed_turned_down", "chocolates_placed"],
  "deep-clean": ["walls_wiped", "grout_cleaned", "furniture_polished", "carpet_shampooed"],
};
```

---

## 14.5 Inspect Task Dialog

```tsx
export function InspectTaskDialog({ taskId, onClose }) {
  const [passed, setPassed] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const inspect = useMutation({
    mutationFn: () => hspApi.post(passed ? `/housekeeping/tasks/${taskId}/inspect` : `/housekeeping/tasks/${taskId}/fail`, { notes }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Inspection Result</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-3">
            <Button variant={passed === true ? "default" : "outline"} className="flex-1 bg-green-600"
              onClick={() => setPassed(true)}>Pass</Button>
            <Button variant={passed === false ? "destructive" : "outline"} className="flex-1"
              onClick={() => setPassed(false)}>Fail</Button>
          </div>
          {passed === false && (
            <Textarea placeholder="Notes for housekeeper (required for fail)" value={notes} onChange={e => setNotes(e.target.value)} />
          )}
          <Button className="w-full" disabled={passed === null || (passed === false && !notes)} onClick={() => inspect.mutateAsync().then(onClose)}>
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```
