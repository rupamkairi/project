# Phase 5 — Housekeeping

---

## 5.1 Housekeeping Routes

```
GET    /hospitality/housekeeping/tasks         housekeeping:read-tasks
POST   /hospitality/housekeeping/tasks         housekeeping:assign (or checkin:process)
GET    /hospitality/housekeeping/tasks/:id     housekeeping:read-tasks
PATCH  /hospitality/housekeeping/tasks/:id     housekeeping:update-task
POST   /hospitality/housekeeping/tasks/:id/assign  housekeeping:assign
POST   /hospitality/housekeeping/tasks/:id/start   housekeeping:update-task
POST   /hospitality/housekeeping/tasks/:id/done    housekeeping:update-task
POST   /hospitality/housekeeping/tasks/:id/inspect  housekeeping:assign
POST   /hospitality/housekeeping/tasks/:id/fail    housekeeping:assign
GET    /hospitality/housekeeping/board         housekeeping:read-tasks (all rooms view)
GET    /hospitality/housekeeping/staff-load    housekeeping:assign
```

---

## 5.2 Housekeeping Task FSM

```
pending ──[task.assign]──► assigned
  guard: housekeeping:assign role
  entry: assignedTo = staffId, assignedAt = now()
  side-effect: notify assigned housekeeper via push notification

assigned ──[task.start]──► in-progress
  guard: assigned housekeeper (own) or supervisor
  entry: startedAt = now()
  side-effect: room.housekeepingStatus → 'cleaning-in-progress'

in-progress ──[task.done]──► done
  guard: assigned housekeeper (own) or supervisor
  entry: completedAt = now(), checklistResults saved
  side-effect: room.housekeepingStatus → 'done' (NOT inspected yet)

done ──[task.inspect]──► inspected
  guard: hk-supervisor only
  entry: inspectedBy, inspectionNotes, inspectionPassed = true
  side-effect: room.housekeepingStatus → 'inspected'

done ──[task.fail-inspection]──► touch-up
  guard: hk-supervisor only
  entry: inspectionPassed = false, inspectionNotes required
  side-effect: room.housekeepingStatus → 'touch-up'
  action: create new task of type 'touch-up', assign to same housekeeper

touch-up ──[task.done]──► done   (re-enters done state for re-inspection)

assigned | in-progress ──[task.reassign]──► assigned (new assignee)
  guard: hk-supervisor only
```

---

## 5.3 Task Types

| Type | Trigger | Priority |
|------|---------|---------|
| `departure-clean` | Auto on `reservation.checked-out` | `rush` if new arrival same day |
| `stay-over` | Morning job (7AM) for occupied rooms | `normal` |
| `turndown` | Evening job (5PM) for occupied rooms if org config | `normal` |
| `deep-clean` | Manual by supervisor | `normal` |
| `inspection` | Manual by supervisor | `high` |
| `touch-up` | Auto on failed inspection | `rush` |

---

## 5.4 Auto Task Generation

Housekeeping tasks are stored in `hsp_housekeeping_assignments`. Rooms are `locations` (type=room). Room status is tracked on `location.status`.

**On check-out:** `reservation.checked-out` hook inserts into `hsp_housekeeping_assignments`:
```typescript
// See 10-backend-logic.md for full hook implementation
await db.insert(hspHousekeepingAssignments).values({
  id: generateId(), organizationId: orgId,
  locationId,  // locations.id (room)
  actorId: null,  // assigned by supervisor
  date: todayStr(),
  taskType: "departure-clean",
  status: "pending",
  priority: sameDay ? "rush" : "normal",
});
```

**Morning stay-over job (7AM daily):**
```typescript
// Get all occupied rooms (locations where type=room and status=occupied)
const occupied = await db.query.locations.findMany({
  where: and(eq(locations.type, "room"), eq(locations.status, "occupied"), eq(locations.organizationId, orgId)),
});
for (const room of occupied) {
  // Skip if already has pending/in-progress assignment today
  const existing = await db.query.hspHousekeepingAssignments.findFirst({
    where: and(
      eq(hspHousekeepingAssignments.locationId, room.id),
      eq(hspHousekeepingAssignments.date, todayStr()),
      inArray(hspHousekeepingAssignments.status, ["pending", "in_progress"]),
    ),
  });
  if (existing) continue;

  await db.insert(hspHousekeepingAssignments).values({
    id: generateId(), organizationId: orgId,
    locationId: room.id,  // locations.id (type=room)
    actorId: null,        // to be assigned by supervisor
    date: todayStr(),
    taskType: "stay-over",
    status: "pending",
    priority: "normal",
  });
}
```

---

## 5.5 Housekeeping Board

`GET /hospitality/housekeeping/board`

Returns all rooms grouped by floor with current status:

```typescript
{
  floors: {
    floor: number;
    rooms: {
      id: string;
      roomNumber: string;
      roomType: string;
      status: string;              // available | occupied | etc.
      housekeepingStatus: string;  // clean | dirty | etc.
      currentTask?: {
        id: string;
        type: string;
        status: string;
        assignedTo?: string;
        startedAt?: string;
      };
      todayReservation?: {
        guestName: string;
        checkInDate: string;
        checkOutDate: string;
        vipStatus: string;
      };
    }[];
  }[];
}
```

---

## 5.6 Assign Task

`POST /hospitality/housekeeping/tasks/:id/assign`

Body: `{ staffId: string }`

Guard: role = `housekeeping:assign` (hk-supervisor or hotel-admin).

Updates task + emits push notification to housekeeper.

---

## 5.7 Complete Task with Checklist

`POST /hospitality/housekeeping/tasks/:id/done`

Body:
```typescript
{
  checklistResults: Record<string, boolean>;  // { "fresh_linen": true, "bathroom_cleaned": true }
  notes?: string;
}
```

Guard:
1. Task `status = 'in-progress'`
2. All mandatory checklist items must be `true` (checklist definition loaded from org config)

Checklist template stored in `hspOrgConfig`:
```typescript
{
  departureChecklist: ["fresh_linen", "bathroom_cleaned", "minibar_restocked", "trash_emptied", "floor_vacuumed"],
  stayoverChecklist: ["towel_refresh", "trash_emptied", "bed_made"],
}
```

If any mandatory item is `false`: reject with `CHECKLIST_INCOMPLETE`.

---

## 5.8 Staff Load View

`GET /hospitality/housekeeping/staff-load`

Returns per housekeeper:
```typescript
{
  staffId: string;
  name: string;
  pendingTasks: number;
  inProgressTask?: string;   // task id
  completedToday: number;
  avgCompletionMinutes: number;
}
```

Used by supervisor to balance workload before assigning.
