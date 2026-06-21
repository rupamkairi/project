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

On post:
```typescript
await db.transaction(async (tx) => {
  const today = todayStr();  // YYYY-MM-DD
  const taxRate = orgConfig.taxRate ? parseFloat(orgConfig.taxRate) / 100 : 0;
  const taxAmount = type !== "tax" && type !== "city-tax"
    ? amount * taxRate
    : 0;

  await tx.insert(hspFolioCharges).values({
    folioId,
    type,
    description,
    amount: amount.toString(),
    taxAmount: taxAmount.toString(),
    postedBy: actorId,
    referenceId,
    date: today,
  });

  await tx.update(hspFolios)
    .set({
      totalCharges: sql`total_charges + ${amount + taxAmount}`,
      balance: sql`balance + ${amount + taxAmount}`,
    })
    .where(eq(hspFolios.id, folioId));
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

On payment:
```typescript
await db.transaction(async (tx) => {
  await tx.insert(hspFolioPayments).values({
    folioId,
    method,
    amount: amount.toString(),
    gatewayRef,
    processedBy: actorId,
  });

  await tx.update(hspFolios)
    .set({
      totalPayments: sql`total_payments + ${amount}`,
      balance: sql`balance - ${amount}`,
    })
    .where(eq(hspFolios.id, folioId));
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

On reverse:
```typescript
await db.transaction(async (tx) => {
  const charge = await tx.query.hspFolioCharges.findFirst({
    where: and(eq(hspFolioCharges.id, chargeId), eq(hspFolioCharges.folioId, folioId))
  });

  await tx.update(hspFolioCharges).set({
    reversed: true,
    reversedAt: new Date(),
    reversedBy: actorId,
  }).where(eq(hspFolioCharges.id, chargeId));

  const reverseAmount = parseFloat(charge.amount) + parseFloat(charge.taxAmount);
  await tx.update(hspFolios).set({
    totalCharges: sql`total_charges - ${reverseAmount}`,
    balance: sql`balance - ${reverseAmount}`,
  }).where(eq(hspFolios.id, folioId));
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

```typescript
async function postNightlyRoomCharges(orgId: string): Promise<void> {
  const tonight = todayStr();  // YYYY-MM-DD

  const openFolios = await db.query.hspFolios.findMany({
    where: and(eq(hspFolios.status, "open")),
    with: { reservation: { with: { ratePlan: true } } },
  });

  for (const folio of openFolios) {
    const reservation = folio.reservation;
    if (reservation.status !== "checked-in") continue;

    // Idempotency: skip if room charge already posted for tonight
    const existing = await db.query.hspFolioCharges.findFirst({
      where: and(
        eq(hspFolioCharges.folioId, folio.id),
        eq(hspFolioCharges.type, "room"),
        eq(hspFolioCharges.date, tonight),
        eq(hspFolioCharges.reversed, false)
      ),
    });
    if (existing) continue;  // already charged, skip

    // Look up rate override for tonight
    const override = await db.query.hspRateOverrides.findFirst({
      where: and(
        eq(hspRateOverrides.ratePlanId, reservation.ratePlanId),
        eq(hspRateOverrides.roomTypeId, reservation.roomTypeId),
        eq(hspRateOverrides.date, tonight)
      ),
    });

    const nightlyRate = override?.rate
      ? parseFloat(override.rate)
      : parseFloat(reservation.ratePerNight);

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
