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

Maintenance requests are stored in `hsp_maintenance_requests` (hsp-owned). Room references use `locationId` (locations.id where type=room). Room blocking updates `location.status`.

Body:
```typescript
{
  locationId?: string;     // locations.id (type=room or common area) — null for non-room areas
  category: "plumbing" | "electrical" | "hvac" | "furniture" | "it" | "cleaning" | "other";
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  roomBlockRequired: boolean;   // block room from new assignments?
}
```

On create:
1. Insert `hspMaintenanceRequests` with `status = 'open'`, `locationId`, `reportedById`
2. If `roomBlockRequired = true` and `locationId` is a room: update `locations.status = 'maintenance'`
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

Rooms are `locations` (type=room). Blocking sets `location.status = 'maintenance'`.

```typescript
if (body.roomBlockRequired && body.locationId) {
  const room = await db.query.locations.findFirst({ where: eq(locations.id, body.locationId) });

  // Cannot block occupied room
  if (room.status === "occupied") {
    throw new ConflictError("ROOM_OCCUPIED", "Cannot block an occupied room. Relocate guest first.");
  }

  await db.update(locations).set({
    status: "maintenance",
    meta: sql`meta || '{"blockReason": ${`Maintenance: ${body.description}`}}'::jsonb`,
  }).where(eq(locations.id, body.locationId));

  bus.emit("hsp.room.blocked", { locationId: body.locationId, reason: "maintenance" });
}
```

On `maintenance.close`: if request had `roomBlockRequired` and room blocked for this maintenance:
```typescript
if (request.roomBlockRequired && request.locationId) {
  await db.update(locations).set({
    status: "available",      // or "housekeeping" if cleaning needed
    meta: sql`meta - 'blockReason'`,
  }).where(eq(locations.id, request.locationId));
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
1. Insert `activities` (type=service_request) with `entityId = reservationId`, `entityType = "hsp.reservation"`
2. Route by type:
   - `housekeeping` → create `hsp_housekeeping_assignments` for the room (location)
   - `maintenance` → create `hsp_maintenance_requests`
   - `fnb` → emit `hsp.fnb.order-requested` (for restaurant module if present)
   - `concierge` → notify front desk via notification module

---

## 9.8 Preventive Maintenance Schedule

Preventive maintenance requests are created automatically by cron:

```typescript
// Monthly deep-clean all rooms
scheduler.register({
  name: "hsp.preventive-maintenance",
  cron: "0 9 1 * *",   // 9AM on the 1st of each month
  fn: async () => {
    // Rooms are locations (type=room) with status not in maintenance/out_of_order
    const rooms = await db.query.locations.findMany({
      where: and(
        eq(locations.organizationId, orgId),
        eq(locations.type, "room"),
        notInArray(locations.status, ["maintenance", "out_of_order"])
      ),
    });
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
