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

**On check-out:** `reservation.checked-out` hook:
```typescript
bus.on("hsp.reservation.checked-out", async ({ roomId, checkInDate: todayArrivals }) => {
  // Check if room has same-day arrival
  const sameDay = await db.query.hspReservations.findFirst({
    where: and(
      eq(hspReservations.roomId, roomId),
      eq(hspReservations.checkInDate, todayStr()),
      eq(hspReservations.status, "confirmed")
    ),
  });

  await db.insert(hspHousekeepingTasks).values({
    roomId,
    type: "departure-clean",
    status: "pending",
    priority: sameDay ? "rush" : "normal",
    scheduledFor: new Date(),
  });
});
```

**Morning stay-over job (7AM daily):**
```typescript
// Get all occupied rooms
const occupied = await db.query.hspRooms.findMany({
  where: eq(hspRooms.status, "occupied"),
});
for (const room of occupied) {
  // Skip if already has pending/in-progress task today
  const existing = await db.query.hspHousekeepingTasks.findFirst({
    where: and(
      eq(hspHousekeepingTasks.roomId, room.id),
      inArray(hspHousekeepingTasks.status, ["pending", "assigned", "in-progress"]),
    ),
  });
  if (existing) continue;

  await db.insert(hspHousekeepingTasks).values({
    roomId: room.id,
    type: "stay-over",
    status: "pending",
    priority: "normal",
    scheduledFor: new Date(),
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
