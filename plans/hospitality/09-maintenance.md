# Phase 9 — Maintenance

---

## 9.1 Maintenance Routes

```
GET    /hospitality/maintenance              maintenance:create | maintenance:update
POST   /hospitality/maintenance              maintenance:create
GET    /hospitality/maintenance/:id          maintenance:create
PATCH  /hospitality/maintenance/:id          maintenance:update
POST   /hospitality/maintenance/:id/assign   maintenance:update
POST   /hospitality/maintenance/:id/start    maintenance:update
POST   /hospitality/maintenance/:id/resolve  maintenance:update
POST   /hospitality/maintenance/:id/close    maintenance:update
GET    /hospitality/maintenance/board        maintenance:create
```

---

## 9.2 Create Maintenance Request

Body:
```typescript
{
  roomId?: string;         // null for common areas
  location: string;        // "Room 203" | "Lobby Elevator" | "Pool Area"
  category: "plumbing" | "electrical" | "hvac" | "furniture" | "it" | "cleaning";
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  roomBlockRequired: boolean;   // block room from new assignments?
}
```

On create:
1. Insert `hspMaintenanceRequests` with `status = 'open'`
2. If `roomBlockRequired = true`: set `room.isBlocked = true`, `room.blockReason = request.id`
3. If `priority = 'urgent'`: emit `hsp.maintenance.urgent` → notify maintenance manager + hotel-admin
4. Emit `hsp.maintenance.created`

---

## 9.3 Maintenance Request FSM

```
open ──[maintenance.assign]──► assigned
  guard: maintenance:update role
  entry: assignedTo = staffId, notify maintenance staff

assigned ──[maintenance.start]──► in-progress
  guard: assigned staff (own) or hotel-admin
  entry: startedAt = now()

in-progress ──[maintenance.resolve]──► resolved
  guard: assigned staff (own) or hotel-admin
  body: { resolution: string; partsUsed?: { itemId, qty, name }[] }
  entry: resolvedAt = now(), resolution saved
  side-effect: if roomBlockRequired, check if unblock is safe

resolved ──[maintenance.close]──► closed
  guard: maintenance supervisor or hotel-admin
  entry: closedAt = now()
  side-effect: if roomBlockRequired and room still blocked, unblock room, set housekeepingStatus = 'dirty'

open | assigned ──[maintenance.reassign]──► assigned (new assignee)
  guard: maintenance:update
```

---

## 9.4 OOO (Out of Order) Room Blocking

When a maintenance request with `roomBlockRequired = true` is created:

```typescript
if (body.roomBlockRequired && body.roomId) {
  const room = await db.query.hspRooms.findFirst({ where: eq(hspRooms.id, body.roomId) });

  // Cannot block occupied room
  if (room.status === "occupied") {
    throw new ConflictError("ROOM_OCCUPIED", "Cannot block an occupied room. Relocate guest first.");
  }

  await db.update(hspRooms).set({
    isBlocked: true,
    blockReason: `Maintenance: ${body.description}`,
  }).where(eq(hspRooms.id, body.roomId));

  bus.emit("hsp.room.blocked", { roomId: body.roomId, reason: "maintenance" });
}
```

On `maintenance.close`: if request had `roomBlockRequired` and room still blocked by this request:
```typescript
if (request.roomBlockRequired && request.roomId) {
  await db.update(hspRooms).set({
    isBlocked: false,
    blockReason: null,
    housekeepingStatus: "dirty",  // needs cleaning before re-occupation
  }).where(and(
    eq(hspRooms.id, request.roomId),
    like(hspRooms.blockReason, `Maintenance: %`)
  ));
}
```

---

## 9.5 Parts Used

On `maintenance.resolve`:

Body field: `partsUsed: [{ itemId?: string; qty: number; name: string }]`

If ERP compose active: deduct parts from ERP inventory via mediator:
```typescript
for (const part of partsUsed) {
  if (part.itemId) {
    await mediator.dispatch({
      type: "inventory.issueStock",
      itemId: part.itemId,
      qty: part.qty,
      referenceId: maintenanceRequestId,
      purpose: "maintenance",
    });
  }
}
```

Otherwise, stored in `hspMaintenanceRequests.partsUsed` jsonb for cost tracking only.

---

## 9.6 Maintenance Board

`GET /hospitality/maintenance/board`

```typescript
{
  byStatus: {
    open: MaintenanceRequest[];
    assigned: MaintenanceRequest[];
    inProgress: MaintenanceRequest[];
    resolved: MaintenanceRequest[];
  };
  urgentCount: number;
  blockedRooms: {
    roomId: string;
    roomNumber: string;
    blockReason: string;
    maintenanceRequestId: string;
  }[];
  staffLoad: {
    staffId: string;
    name: string;
    assigned: number;
    inProgress: number;
  }[];
}
```

---

## 9.7 Service Request Routes

Service requests are guest-facing (from GuestApp):

```
POST   /hospitality/service-requests          guest | front-desk
GET    /hospitality/service-requests          front-desk | housekeeping
PATCH  /hospitality/service-requests/:id      front-desk | housekeeping
POST   /hospitality/service-requests/:id/complete  front-desk | housekeeping
```

**Create service request body:**
```typescript
{
  reservationId: string;
  type: "housekeeping" | "fnb" | "concierge" | "maintenance" | "other";
  description: string;
  priority?: "normal" | "high";
}
```

On create:
1. Insert `hspServiceRequests` with `status = 'pending'`
2. Route by type:
   - `housekeeping` → create `hspHousekeepingTasks` for room
   - `maintenance` → create `hspMaintenanceRequests`
   - `fnb` → emit `hsp.fnb.order-requested` (for restaurant module if present)
   - `concierge` → notify front desk

---

## 9.8 Preventive Maintenance Schedule

Preventive maintenance requests are created automatically by cron:

```typescript
// Monthly deep-clean all rooms
scheduler.register({
  name: "hsp.preventive-maintenance",
  cron: "0 9 1 * *",   // 9AM on the 1st of each month
  fn: async () => {
    const rooms = await db.query.hspRooms.findMany({ where: eq(hspRooms.isBlocked, false) });
    for (const room of rooms) {
      // Only create if no recent deep-clean in last 25 days
      const recent = await db.query.hspMaintenanceRequests.findFirst({
        where: and(
          eq(hspMaintenanceRequests.roomId, room.id),
          eq(hspMaintenanceRequests.category, "cleaning"),
          gte(hspMaintenanceRequests.createdAt, new Date(Date.now() - 25 * 86400000))
        ),
      });
      if (!recent) {
        await db.insert(hspMaintenanceRequests).values({
          roomId: room.id,
          location: `Room ${room.roomNumber}`,
          category: "cleaning",
          description: "Monthly preventive deep clean",
          priority: "low",
          status: "open",
          reportedBy: systemActorId,
          roomBlockRequired: false,
        });
      }
    }
  },
});
```
