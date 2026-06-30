# Phase 5 — Delivery

---

## 5.1 Delivery Routes

```
GET    /restaurant/deliveries                    rst:dispatcher
GET    /restaurant/deliveries/:id                rst:dispatcher | rst:rider
POST   /restaurant/deliveries/:id/assign         rst:dispatcher
POST   /restaurant/deliveries/:id/unassign       rst:dispatcher
POST   /restaurant/deliveries/:id/status         rst:rider (own)
PATCH  /restaurant/riders/:id/location           rst:rider (own)
GET    /restaurant/riders                        rst:dispatcher
PATCH  /restaurant/riders/:id/status             rst:rider (own)
POST   /restaurant/deliveries/:id/pod            rst:rider (own)
```

---

## 5.2 Delivery FSM

```
pending-assignment
  ──[delivery.assign]──► assigned
    guard: rider.status = 'available', rider.outletId = delivery.outletId
    entry: rider.status → 'busy', notify rider, estimatedPickupAt = now + avgPrepTime

assigned
  ──[delivery.heading-to-outlet]──► rider-heading-to-outlet
    entry: rider app triggers, timestamp recorded

rider-heading-to-outlet
  ──[delivery.reached-outlet]──► reached-outlet
    entry: timestamp

reached-outlet
  ──[delivery.picked-up]──► picked-up
    guard: order status = 'ready'
    entry: pickedUpAt = now(), estimatedDeliveryAt = now + distanceETA

picked-up
  ──[delivery.out-for-delivery]──► out-for-delivery
    entry: order status → 'out-for-delivery'

out-for-delivery
  ──[delivery.delivered]──► delivered
    guard: POD captured if required
    entry: deliveredAt = now(), order.status → 'completed', rider.status → 'available'

out-for-delivery
  ──[delivery.failed]──► failed
    body: { reason }
    entry: order.status → 'ready' (back to re-dispatch), rider.status → 'available'

failed
  ──[delivery.return]──► returned
    entry: returned order flagged for refund
```

---

## 5.3 Rider Assignment

`POST /restaurant/deliveries/:id/assign`

Body: `{ riderId?: string }` — if omitted, auto-assign nearest available rider.

**Nearest-rider algorithm:**
```typescript
async function findNearestRider(orgId: string, outletId: string): Promise<Person | null> {
  // Riders are persons with type="rider". Available status stored in meta.status.
  const availableRiders = await mediator.query({
    type: "identity.listPersons",
    payload: { organizationId: orgId, type: "rider", metaFilter: { status: "available" } },
  });

  if (availableRiders.length === 0) return null;

  const outlet = await mediator.query({ type: "location.getLocation", payload: { locationId: outletId } });
  const outletCoords = outlet?.meta?.location;
  if (!outletCoords) return availableRiders[0];  // no location data, pick first

  let nearest: Person | null = null;
  let minDist = Infinity;

  for (const rider of availableRiders) {
    const riderCoords = rider.meta?.currentLocation;
    if (!riderCoords) continue;
    const dist = haversineKm(outletCoords, riderCoords);
    if (dist < minDist) {
      minDist = dist;
      nearest = rider;
    }
  }

  return nearest ?? availableRiders[0];  // fallback: any available
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
```

After assignment:
1. `rider.status → 'busy'`, `rider.activeDeliveryId = deliveryId`
2. Emit `rst.delivery.assigned` → WebSocket push to rider app
3. Emit `rst.delivery.assigned` → WebSocket push to dispatcher dashboard

---

## 5.4 Rider Location Update

`PATCH /restaurant/riders/:id/location`

Body: `{ lat: number; lng: number }`

Rate limit: accept at most 1 update per 5 seconds per rider (same debounce pattern as LMS heartbeat).

```typescript
// Rider is a persons record (type=rider) — update meta via mediator
await mediator.send({
  type: "identity.updatePersonMeta",
  payload: { personId: riderId, meta: { currentLocation: { lat, lng } } },
});

// If rider has active delivery, broadcast location to customer-facing app
if (rider.activeDeliveryId) {
  await db.update(rstDeliveries).set({
    riderLocation: { lat, lng, updatedAt: new Date().toISOString() },
  }).where(eq(rstDeliveries.id, rider.activeDeliveryId));

  bus.emit("rst.delivery.rider-location", {
    deliveryId: rider.activeDeliveryId,
    lat,
    lng,
  });
}
```

---

## 5.5 Delivery Status Updates

`POST /restaurant/deliveries/:id/status`

Body: `{ status: string; notes?: string }`

Guard: only the assigned rider can update their own delivery (or dispatcher).

Valid transitions per FSM (section 5.2). Invalid transitions throw `INVALID_STATUS_TRANSITION`.

On each update: emit `rst.delivery.status-update` → dispatcher dashboard + customer app.

---

## 5.6 Proof of Delivery

`POST /restaurant/deliveries/:id/pod`

Body: `{ documentId: string }` — doc ref from media upload module.

Sets `delivery.proofOfDelivery = documentId`. Required before `delivered` transition if org config `requirePOD = true`.

---

## 5.7 Unassign Rider

`POST /restaurant/deliveries/:id/unassign`

Body: `{ reason: string }`

Guards:
1. Delivery `status = 'assigned'` (cannot unassign once picked up)
2. Role = `rst:dispatcher`

On unassign:
1. `delivery.status → 'pending-assignment'`
2. `rider.status → 'available'`
3. `rider.activeDeliveryId → null`
4. Log unassignment reason

---

## 5.8 Dispatcher Dashboard Data

`GET /restaurant/deliveries`

Query params:
- `outletId`
- `status` (multi-value: `pending-assignment,assigned,out-for-delivery`)
- `date` (defaults today)

Response groups:
```
{
  pendingAssignment: Delivery[];
  inProgress: Delivery[];        // assigned through out-for-delivery
  completed: Delivery[];
  failed: Delivery[];
  riderStatuses: { riderId, name, status, activeDeliveryId, currentLocation }[];
}
```

`GET /restaurant/riders`

Returns all riders for outlet with `status`, `currentLocation`, `activeDeliveryId`, current delivery ETA.
