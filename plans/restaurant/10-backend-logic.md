# Phase 10 — Backend Logic (FSMs, Hooks, Jobs, Rules)

---

## 10.1 All FSMs Summary

| Entity | States |
|--------|--------|
| Order | `draft → placed → accepted / rejected → preparing → ready → served (dine-in) / out-for-delivery → completed` |
| KOT | `sent → accepted → preparing → ready / cancelled` |
| Delivery | `pending-assignment → assigned → rider-heading-to-outlet → reached-outlet → picked-up → out-for-delivery → delivered / failed → returned` |
| Bill | `open → printed → settled / voided` |
| Shift | `open → closing / variance-flagged → closed` |

---

## 10.2 `registerRestaurantHooks(bus, mediator)`

```typescript
export function registerRestaurantHooks(bus: EventBus, mediator: Mediator): void {

  // Order placed → broadcast to KDS
  bus.on("rst.order.placed", async ({ orderId, source }) => {
    const kots = await getKotsForOrder(orderId);
    for (const kot of kots) {
      bus.emit("rst.kds.new-kot", {
        kotId: kot.id,
        outletId: kot.outletId,
        station: kot.station,
        orderId,
        source,
      });
    }
    // Live order stream SSE
    bus.emit("rst.orders.live-update", { orderId, event: "placed" });
  });

  // All KOTs ready → order ready
  bus.on("rst.kot.ready", async ({ kotId, orderId }) => {
    const kots = await getKotsForOrder(orderId);
    const allReady = kots.every(k => k.status === "ready");
    if (allReady) {
      // Advance order to Ready stage in rst.order pipeline
      const readyStage = await getStageByName(orgId, "rst.order", "Ready");
      await mediator.send({ type: "commerce.advanceStage", payload: { transactionId: orderId, stageId: readyStage.id } });
      bus.emit("rst.order.ready", { orderId });

      const order = await getOrder(orderId);
      if (order.meta?.orderType === "delivery") {
        // Auto-create delivery record in rst_deliveries
        const assignedStage = await getStageByName(orgId, "rst.delivery", "Assigned");
        const delivery = await db.insert(rstDeliveries).values({
          id: createId(),
          organizationId: order.organizationId,
          transactionId: orderId,
          stageId: assignedStage.id,
          deliveryAddress: order.meta.deliveryAddress,
        }).returning();
        bus.emit("rst.delivery.created", { deliveryId: delivery[0].id });
      }
    }
  });

  // Order completed (settled) → update analytics, reset table
  bus.on("rst.order.completed", async ({ orderId }) => {
    const order = await getOrder(orderId);
    const tableId = order.meta?.tableId;
    if (tableId && order.meta?.orderType === "dine-in") {
      // Reset the table location status in master locations table
      await mediator.send({ type: "location.updateStatus", payload: { locationId: tableId, status: "active" } });
    }
    await mediator.dispatch({
      type: "accounting.postRevenue",
      amount: order.subtotal,
      tax: order.tax,
      referenceId: orderId,
      outletId: order.meta?.outletId,
    });
  });

  // Menu item 86d → broadcast to all POS sessions
  bus.on("rst.menu.item-86d", async ({ menuItemId, outletId, available }) => {
    bus.emit("rst.pos.broadcast", {
      outletId,
      event: "menu-update",
      data: { menuItemId, isAvailable: available },
    });
  });

  // Aggregator order received → auto-ingest
  bus.on("rst.aggregator.webhook", async ({ source, outletCode, payload }) => {
    const outlet = await getOutletByCode(outletCode);
    const normalized = normalizeAggregatorOrder(source, payload, outlet.id);
    await ingestAggregatorOrder(normalized);
  });

  // Delivery failed → free rider (update rider person meta), revert order stage
  bus.on("rst.delivery.failed", async ({ deliveryId, riderId }) => {
    // Rider is a persons record (type=rider) — update status in meta via mediator
    await mediator.send({ type: "identity.updatePersonMeta", payload: { personId: riderId, meta: { status: "available", activeDeliveryId: null } } });
    const delivery = await getDelivery(deliveryId);
    const readyStage = await getStageByName(delivery.organizationId, "rst.order", "Ready");
    await mediator.send({ type: "commerce.advanceStage", payload: { transactionId: delivery.transactionId, stageId: readyStage.id } });
  });

  // Delivery delivered → complete order + free rider
  bus.on("rst.delivery.delivered", async ({ deliveryId, riderId, orderId }) => {
    await mediator.send({ type: "identity.updatePersonMeta", payload: { personId: riderId, meta: { status: "available", activeDeliveryId: null } } });
    await db.update(rstDeliveries).set({ deliveredAt: new Date() }).where(eq(rstDeliveries.id, deliveryId));
    bus.emit("rst.order.completed", { orderId });
  });
}
```

---

## 10.3 `registerRestaurantJobs(scheduler, mediator)`

```typescript
export function registerRestaurantJobs(scheduler: Scheduler, mediator: Mediator): void {

  // Check for unassigned deliveries every 2 min
  scheduler.register({
    name: "rst.delivery-assignment-check",
    cron: "*/2 * * * *",
    fn: async () => {
      // rst_deliveries — filter by stageId matching the "Assigned" stage (pending assignment = no personId yet)
      const unassigned = await db.query.rstDeliveries.findMany({
        where: (d, { isNull }) => isNull(d.personId),
      });
      for (const delivery of unassigned) {
        // Auto-assign if available rider exists (riders are persons type=rider)
        const rider = await findNearestRider(delivery.organizationId, delivery.transactionId);
        if (rider) {
          await assignRider(delivery.id, rider.id);
        } else {
          bus.emit("rst.delivery.no-rider", { deliveryId: delivery.id });
        }
      }
    },
  });

  // Operating hours auto-close/open daily
  scheduler.register({
    name: "rst.operating-hours-check",
    cron: "*/10 * * * *",   // every 10 min
    fn: async () => {
      // Outlets are locations with type="outlet" — read via mediator
      const outlets = await mediator.query({ type: "location.listLocations", payload: { type: "outlet" } });
      const now = new Date();
      const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      for (const outlet of outlets) {
        const hours = outlet.meta?.operatingHours?.[dayOfWeek];
        if (!hours) continue;
        if (currentTime < hours.open && outlet.status === "active") {
          await mediator.send({ type: "location.updateStatus", payload: { locationId: outlet.id, status: "inactive" } });
        }
        if (currentTime >= hours.open && currentTime <= hours.close && outlet.status === "inactive") {
          await mediator.send({ type: "location.updateStatus", payload: { locationId: outlet.id, status: "active" } });
        }
      }
    },
  });

  // Ingredient reorder alerts — daily 8AM
  scheduler.register({
    name: "rst.reorder-alerts",
    cron: "0 8 * * *",
    fn: async () => {
      // Ingredients are cat_items (type=stock_item) — query low stock via inventory mediator
      const lowStock = await mediator.query({ type: "inventory.listLowStock", payload: { organizationId: orgId } });
      // Note: original pattern was:
      // where: lte(rstIngredients.currentStock, rstIngredients.reorderLevel),
      });
      if (lowStock.length > 0) {
        await mediator.dispatch({ type: "notify.lowStockAlert", items: lowStock });
      }
    },
  });

  // Nightly analytics aggregation
  scheduler.register({
    name: "rst.analytics-aggregate",
    cron: "0 2 * * *",
    fn: async () => {
      await aggregateDailyRestaurantMetrics();
    },
  });

  // Channel sync for aggregator menus every hour
  scheduler.register({
    name: "rst.aggregator-menu-sync",
    cron: "0 * * * *",
    fn: async () => {
      await syncMenuToAggregators();
    },
  });
}
```

---

## 10.4 Restaurant Business Rules

```typescript
export const RESTAURANT_RULES = [
  {
    id: "kds-latency",
    rule: "KOTs must appear on KDS within 1s. Use EventBus → WebSocket broadcast. Never polling.",
  },
  {
    id: "ingredient-deduction-transactional",
    rule: "Ingredient deduction inside DB transaction on order.place. WHERE current_stock >= needed for negative guard.",
  },
  {
    id: "outlet-closed-guard",
    rule: "Validate outlet status + order type acceptance before every order create. Not just at session start.",
  },
  {
    id: "aggregator-idempotency",
    rule: "Check aggregatorOrderId unique before insert. Ack 200 immediately, process async if needed.",
  },
  {
    id: "aggregator-sla",
    rule: "Aggregator webhook must receive HTTP 200 within 90s or penalty applies. Store raw payload first, process after ack.",
  },
  {
    id: "bill-rounding",
    rule: "Split bill items must cover all order items exactly once. Rounding goes to first split.",
  },
  {
    id: "shift-close-guard",
    rule: "Cannot close shift with open bills or pending orders. Check before transition.",
  },
  {
    id: "kot-station-routing",
    rule: "KOTs grouped by menuItem.station. Multiple stations = multiple KOTs per order.",
  },
  {
    id: "86-toggle-broadcast",
    rule: "isAvailable toggle emits bus event → all active POS sessions must update UI in real-time.",
  },
] as const;
```
