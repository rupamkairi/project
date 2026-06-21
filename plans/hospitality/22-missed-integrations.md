# Phase 22 — Missed Integrations & Critical Pitfalls

---

## 22.1 Nightly Room Charge: Idempotency

**Pitfall:** Cron restarts or runs twice → guest charged twice for same night.

**Guard — check before posting:**
```typescript
const existing = await db.select()
  .from(hspFolioCharges)
  .where(and(
    eq(hspFolioCharges.folioId, folioId),
    eq(hspFolioCharges.chargeDate, today),
    eq(hspFolioCharges.type, "room"),
    eq(hspFolioCharges.reversed, false),
  ))
  .limit(1);

if (existing.length > 0) {
  return;  // Already charged — skip silently
}

// Only post if no existing charge found
await postRoomCharge(folioId, amount, today);
```

Run at 11PM. Never midnight (guests may still be checking in).

---

## 22.2 Availability: Double-Check at Confirm

**Pitfall:** Check at `tentative` creation is valid, but another booking fills the room before guest confirms.

**Guard — re-check inside DB transaction at `confirm`:**
```typescript
await db.transaction(async (tx) => {
  const available = await checkAvailability(tx, {
    roomTypeId,
    checkInDate,
    checkOutDate,
    excludeReservationId: reservationId,  // Exclude self
  });

  if (!available) {
    await tx.update(hspReservations)
      .set({ status: "waitlisted" })
      .where(eq(hspReservations.id, reservationId));
    throw new ConflictError("NO_ROOMS_AVAILABLE");
  }

  await tx.update(hspReservations).set({ status: "confirmed" }).where(eq(hspReservations.id, reservationId));
});
```

---

## 22.3 Check-In: Room Must Be Inspected

**Pitfall:** Allowing check-in for rooms marked `done` (cleaned) but not `inspected` → guest arrives to unchecked room.

**Guard:**
```typescript
if (room.housekeepingStatus !== "inspected") {
  throw new ConflictError("ROOM_NOT_INSPECTED", {
    roomNumber: room.roomNumber,
    currentStatus: room.housekeepingStatus,
  });
}
```

`done` → supervisor inspects → `inspected` → front desk can check in.

---

## 22.4 Check-Out: Folio Balance Must Be Zero

**Pitfall:** Guest checks out with outstanding balance → revenue lost.

**Guard:**
```typescript
const folio = await getFolioByReservation(reservationId);
const balance = parseFloat(folio.balance);

if (balance > 0) {
  throw new ConflictError("OUTSTANDING_BALANCE", { balance: folio.balance });
}
// Exception: city-ledger / corporate accounts
if (balance > 0 && !reservation.isCityLedger) {
  throw new ConflictError("OUTSTANDING_BALANCE", { balance: folio.balance });
}
```

---

## 22.5 Cancellation Penalty: Always Server-Computed

**Pitfall:** Client sends penalty amount in cancel request → can be manipulated.

**Pattern:**
```typescript
// Cancel endpoint NEVER accepts penalty from client
app.post("/hospitality/reservations/:id/cancel", async ({ params }) => {
  const reservation = await getReservation(params.id);
  const ratePlan = await getRatePlan(reservation.ratePlanId);

  // Server computes penalty from policy
  const penalty = computeCancellationPenalty(reservation, ratePlan.cancellationPolicy);

  await db.update(hspReservations).set({
    status: "cancelled",
    cancellationPenalty: penalty.toString(),
    cancelledAt: new Date(),
  }).where(eq(hspReservations.id, params.id));

  return { reservation: await getReservation(params.id), penalty };
});
```

`computeCancellationPenalty` checks hours until check-in vs `freeCancellationHours`, then applies `penaltyPct` of first night.

---

## 22.6 No-Show Processing: 2AM Not Midnight

**Pitfall:** Running no-show cron at midnight → guests arriving on late flights still marked no-show.

**Job schedule:** `0 2 * * *` (2AM local property time).

**Pattern:**
```typescript
// Find reservations with checkInDate = yesterday, status = confirmed
const yesterday = getLocalDate(hspConfig.timezone, -1);

const noShows = await db.select()
  .from(hspReservations)
  .where(and(
    eq(hspReservations.checkInDate, yesterday),
    eq(hspReservations.status, "confirmed"),
  ));
```

---

## 22.7 OOO Block: Cannot Block Occupied Room

**Pitfall:** Maintenance blocks a room while a guest is checked in → guest gets locked out.

**Guard before creating OOO block:**
```typescript
if (room.status === "occupied") {
  throw new ConflictError("ROOM_IS_OCCUPIED", {
    message: "Relocate guest before blocking room for maintenance.",
  });
}
```

---

## 22.8 Guest ID Encryption (PII)

**Pitfall:** Passport/ID numbers stored as plain text → PII exposure in DB breach.

**Pattern:**
```typescript
// packages/hospitality/src/lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export function encryptPii(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(hspConfig.encryptionKey, "hex"), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptPii(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(hspConfig.encryptionKey, "hex"), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
```

Encrypt `idType`, `idNumber`, `dateOfBirth` before insert.

---

## 22.9 OTA Channel Sync: Stale Detection

**Pitfall:** Channel inventory shows as synced but `lastSyncAt` is 45 minutes old → OTA oversells.

**Guard in `syncChannelInventory()`:**
```typescript
const staleChannels = await db.select()
  .from(hspChannelInventory)
  .where(lt(hspChannelInventory.lastSyncAt, sql`now() - interval '30 minutes'`))
  .groupBy(hspChannelInventory.channel);

for (const ch of staleChannels) {
  await bus.publish("hospitality.channel.stale", { channel: ch.channel });
}
```

UI shows stale badge; revenue dashboard highlights stale channels in amber.

---

## 22.10 Confirmation Number: Atomic Sequence

**Pitfall:** Two simultaneous reservations get the same confirmation number if sequence is read-then-increment.

**Pattern — atomic increment:**
```typescript
const result = await db.execute(sql`
  UPDATE hsp_reservation_sequence
  SET last_seq = last_seq + 1
  WHERE org_id = ${orgId}
  RETURNING last_seq, EXTRACT(YEAR FROM NOW()) AS year
`);

const confirmationNumber = `HTL-${result[0].year}-${String(result[0].last_seq).padStart(5, "0")}`;
```

`hsp_reservation_sequence` table: one row per `orgId`, with `last_seq INT DEFAULT 0`.

---

## 22.11 Housekeeping: Rush Priority for Same-Day Arrivals

**Pitfall:** Departure-clean task created at normal priority for a room that has a same-day arrival → housekeeper doesn't prioritize → guest waits.

**Guard in `checked-out` hook:**
```typescript
bus.on("hospitality.reservation.checked-out", async ({ reservationId, roomId }) => {
  const hasSameDayArrival = await checkSameDayArrival(roomId);
  await createHousekeepingTask({
    roomId,
    type: "departure-clean",
    priority: hasSameDayArrival ? "rush" : "normal",
  });
});
```

---

## 22.12 Folio Charge Reversal: Double-Reverse Guard

**Pitfall:** Reversing a charge twice → folio balance goes negative, showing guest a credit.

**Guard:**
```typescript
const charge = await getCharge(chargeId);

if (charge.reversed) {
  throw new ConflictError("CHARGE_ALREADY_REVERSED");
}

await db.transaction(async (tx) => {
  await tx.update(hspFolioCharges).set({ reversed: true, reversedAt: new Date() }).where(eq(hspFolioCharges.id, chargeId));
  await tx.update(hspFolios).set({ balance: sql`balance - ${charge.amount}` }).where(eq(hspFolios.id, charge.folioId));
});
```

---

## 22.13 Checklist Before Going Live

- [ ] `HSP_ENCRYPTION_KEY` (32-byte hex) set in server env; test encrypt/decrypt round-trip
- [ ] `HSP_BOOKING_COM_HMAC_SECRET` and `HSP_EXPEDIA_HMAC_SECRET` set in server env
- [ ] OTA webhook endpoints registered in channel manager dashboards
- [ ] `hsp_reservation_sequence` table seeded with one row per org (`last_seq = 0`)
- [ ] Nightly room charge cron tested in staging with date rollover
- [ ] No-show cron confirmed at 2AM (not midnight) in property timezone
- [ ] Folio balance check tested: checkout with balance > 0 must fail
- [ ] Room inspected check tested: checkout for `done` room must fail
- [ ] Cancellation penalty computed server-side; client submit tested with tampered penalty amount
- [ ] OOO block for occupied room tested: must throw `ROOM_IS_OCCUPIED`
- [ ] OTA stale detection threshold (30min) matches `HSP_CHANNEL_SYNC_INTERVAL_MINUTES × 2`
- [ ] Guest token link (email/QR) tested end-to-end on mobile viewport
