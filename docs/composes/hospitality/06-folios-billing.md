# Phase 6 — Folios & Billing

---

## 6.1 Folio Routes

```
GET    /hospitality/folios/:id              folio:read (own or staff)
GET    /hospitality/reservations/:id/folio  folio:read
POST   /hospitality/folios/:id/charge       folio:post-charge
POST   /hospitality/folios/:id/payment      folio:settle
POST   /hospitality/folios/:id/reverse      folio:post-charge
POST   /hospitality/folios/:id/settle       folio:settle
POST   /hospitality/folios/:id/print        folio:read
GET    /hospitality/city-ledger             folio:settle (hotel-admin)
```

---

## 6.2 Post Charge to Folio

`POST /hospitality/folios/:id/charge`

Body:
```typescript
{
  type: "room" | "fnb" | "minibar" | "laundry" | "spa" | "tax" | "city-tax" | "misc";
  description: string;
  amount: number;
  referenceId?: string;   // service request id, restaurant order id, etc.
}
```

Guards:
1. Folio `status = 'open'`
2. Reservation `status = 'checked-in'` (cannot charge a future or past reservation)
3. `amount > 0` (use `/reverse` for credits)

Folios are `transactions` (type=bill). Charges are `transaction_lines`. Payments are `hsp_payment_records`.

On post charge — add a `transaction_line` to the folio (bill) transaction:
```typescript
await db.transaction(async (tx) => {
  const taxRate = orgConfig.taxRate ? parseFloat(orgConfig.taxRate) / 100 : 0;
  const taxAmount = type !== "tax" && type !== "city-tax" ? amount * taxRate : 0;

  // Add charge as a transaction_line on the folio (bill) transaction
  await tx.insert(transactionLines).values({
    id: generateId(), organizationId: orgId,
    transactionId: folioId,  // transactions.id where type=bill
    itemId: referenceId ?? null,
    qty: 1,
    unitPrice: amount.toString(),
    meta: { type, description, taxAmount: taxAmount.toString(), postedBy: actorId, date: todayStr() },
  });

  // Update folio meta totals
  await tx.update(transactions).set({
    meta: sql`jsonb_set(jsonb_set(meta, '{totalCharges}', to_jsonb((meta->>'totalCharges')::numeric + ${amount + taxAmount})), '{balance}', to_jsonb((meta->>'balance')::numeric + ${amount + taxAmount}))`,
  }).where(eq(transactions.id, folioId));
});
```

---

## 6.3 Post Payment to Folio

`POST /hospitality/folios/:id/payment`

Body:
```typescript
{
  method: "cash" | "card" | "upi" | "corporate" | "city-ledger";
  amount: number;
  gatewayRef?: string;
}
```

Guards:
1. Folio `status = 'open'`
2. `amount > 0`

Payments are recorded in `hsp_payment_records` (hsp-owned). Folio balance tracked in `transaction.meta`.

On payment:
```typescript
await db.transaction(async (tx) => {
  // Insert payment record (hsp-owned detail table)
  await tx.insert(hspPaymentRecords).values({
    id: generateId(), organizationId: orgId,
    transactionId: folioId,  // transactions.id where type=bill
    method,
    amount: amount.toString(),
    gatewayRef,
    paidAt: new Date(),
    status: "completed",
  });

  // Update folio meta totals
  await tx.update(transactions).set({
    meta: sql`jsonb_set(jsonb_set(meta, '{totalPayments}', to_jsonb((meta->>'totalPayments')::numeric + ${amount})), '{balance}', to_jsonb((meta->>'balance')::numeric - ${amount}))`,
  }).where(eq(transactions.id, folioId));
});
```

---

## 6.4 Reverse a Charge

`POST /hospitality/folios/:id/reverse`

Body: `{ chargeId: string; reason: string }`

Guards:
1. Folio `status = 'open'`
2. Charge must belong to this folio
3. Charge not already reversed
4. Role = `folio:post-charge`

Charges are `transaction_lines`. Reversal marks the line in `meta.reversed` and adds a credit line.

On reverse:
```typescript
await db.transaction(async (tx) => {
  const line = await tx.query.transactionLines.findFirst({
    where: and(eq(transactionLines.id, chargeId), eq(transactionLines.transactionId, folioId))
  });

  // Mark line as reversed in meta
  await tx.update(transactionLines).set({
    meta: sql`meta || '{"reversed": true, "reversedBy": ${actorId}, "reversedAt": ${new Date().toISOString()}}'::jsonb`,
  }).where(eq(transactionLines.id, chargeId));

  const taxAmount = parseFloat(line.meta?.taxAmount ?? "0");
  const reverseAmount = parseFloat(line.unitPrice as string) + taxAmount;

  // Update folio balance
  await tx.update(transactions).set({
    meta: sql`jsonb_set(jsonb_set(meta, '{totalCharges}', to_jsonb((meta->>'totalCharges')::numeric - ${reverseAmount})), '{balance}', to_jsonb((meta->>'balance')::numeric - ${reverseAmount}))`,
  }).where(eq(transactions.id, folioId));
});
```

---

## 6.5 Settle Folio

`POST /hospitality/folios/:id/settle`

Guard: `balance <= 0` (overpaid is OK, becomes credit). Called automatically during checkout.

If `balance > 0` and caller requests city ledger:
- `status → 'city-ledger'`
- Create city ledger entry for corporate account

If `balance <= 0`:
- `status → 'settled'`, `settledAt = now()`
- Emit `hsp.folio.settled`
- Post revenue to accounting: `mediator.dispatch({ type: "accounting.postHotelRevenue", ... })`
- Generate tax invoice document

---

## 6.6 Nightly Room Charge Job

Cron: daily 11PM.

For each open folio with active (checked-in) reservation:

Folios are `transactions` (type=bill). Charges are `transaction_lines`. Check idempotency via `transaction_lines.meta.date + meta.type`.

```typescript
async function postNightlyRoomCharges(orgId: string): Promise<void> {
  const tonight = todayStr();  // YYYY-MM-DD

  // Open folios = transactions (type=bill) with meta.status=open, for this org
  const openFolios = await db.query.transactions.findMany({
    where: and(
      eq(transactions.organizationId, orgId),
      eq(transactions.type, "bill"),
      sql`meta->>'status' = 'open'`,
    ),
  });

  for (const folio of openFolios) {
    const reservationId = folio.meta?.reservationId;
    if (!reservationId) continue;
    const reservation = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, reservationId), eq(transactions.type, "order")),
    });
    // Only charge if reservation is in Checked In stage
    const checkedInStageId = await getStageId(orgId, "hsp.reservation", "Checked In");
    if (reservation?.stageId !== checkedInStageId) continue;

    // Idempotency: skip if room charge line already posted for tonight
    const existing = await db.query.transactionLines.findFirst({
      where: and(
        eq(transactionLines.transactionId, folio.id),
        sql`meta->>'type' = 'room'`,
        sql`meta->>'date' = ${tonight}`,
        sql`coalesce((meta->>'reversed')::boolean, false) = false`,
      ),
    });
    if (existing) continue;

    // Look up rate from hsp_rate_plan_seasons for tonight
    const ratePlanId = reservation.meta?.ratePlanId;
    const roomTypeId = reservation.meta?.roomTypeId;
    const season = await db.query.hspRatePlanSeasons.findFirst({
      where: and(
        eq(hspRatePlanSeasons.ratePlanId, ratePlanId),
        eq(hspRatePlanSeasons.roomTypeId, roomTypeId),
        lte(hspRatePlanSeasons.startDate, tonight),
        gte(hspRatePlanSeasons.endDate, tonight),
      ),
    });
    const nightlyRate = season ? parseFloat(season.pricePerNight as string) : 0;

    await postChargeToFolio(folio.id, {
      type: "room",
      description: `Room charge – ${tonight}`,
      amount: nightlyRate,
      date: tonight,
    }, systemActorId);
  }
}
```

**Critical:** idempotency check (`existing` query) prevents duplicate posting if cron retries.

---

## 6.7 Folio FSM

```
open ──[folio.settle]──► settled
  guard: balance <= 0
  entry: settledAt = now(), post revenue to accounting, generate tax invoice

open ──[folio.city-ledger]──► city-ledger
  guard: corporate reservation, balance > 0
  entry: create city ledger account entry
```

---

## 6.8 Print Folio

`POST /hospitality/folios/:id/print`

Returns structured folio data for PDF generation:
```typescript
{
  hotel: { name, address, phone, gstNumber },
  guest: { name, email, address },
  reservation: { confirmationNumber, checkInDate, checkOutDate, roomNumber, roomType },
  charges: FolioCharge[],
  payments: FolioPayment[],
  totalCharges: number,
  totalPayments: number,
  balance: number,
  currency: string,
  printedAt: string,
}
```

PDF generated client-side via `@react-pdf/renderer` in the FrontDeskApp.
