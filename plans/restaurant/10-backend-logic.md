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
      await db.update(rstOrders).set({ status: "ready" }).where(eq(rstOrders.id, orderId));
      bus.emit("rst.order.ready", { orderId });

      const order = await getOrder(orderId);
      if (order.type === "delivery") {
        // Auto-create delivery record
        const delivery = await db.insert(rstDeliveries).values({
          orderId,
          outletId: order.outletId,
          status: "pending-assignment",
          dropAddress: order.deliveryAddress,
        }).returning();
        bus.emit("rst.delivery.created", { deliveryId: delivery[0].id });
      }
    }
  });

  // Order completed (settled) → update analytics, reset table
  bus.on("rst.order.completed", async ({ orderId }) => {
    const order = await getOrder(orderId);
    if (order.tableId && order.type === "dine-in") {
      await db.update(rstTables)
        .set({ status: "dirty", currentOrderId: null })
        .where(eq(rstTables.id, order.tableId));
    }
    await mediator.dispatch({
      type: "accounting.postRevenue",
      amount: order.subtotal,
      tax: order.tax,
      referenceId: orderId,
      outletId: order.outletId,
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

  // Delivery failed → free rider
  bus.on("rst.delivery.failed", async ({ deliveryId, riderId }) => {
    await db.update(rstRiders).set({ status: "available", activeDeliveryId: null })
      .where(eq(rstRiders.id, riderId));
    const delivery = await getDelivery(deliveryId);
    await db.update(rstOrders).set({ status: "ready" }).where(eq(rstOrders.id, delivery.orderId));
  });

  // Delivery delivered → complete order + free rider
  bus.on("rst.delivery.delivered", async ({ deliveryId, riderId, orderId }) => {
    await db.update(rstRiders).set({ status: "available", activeDeliveryId: null })
      .where(eq(rstRiders.id, riderId));
    await db.update(rstOrders).set({ status: "completed", deliveredAt: new Date() })
      .where(eq(rstOrders.id, orderId));
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
      const unassigned = await db.query.rstDeliveries.findMany({
        where: eq(rstDeliveries.status, "pending-assignment"),
        with: { order: true },
      });
      for (const delivery of unassigned) {
        // Auto-assign if available rider exists
        const rider = await findNearestRider(delivery.outletId, delivery.order.outletId);
        if (rider) {
          await assignRider(delivery.id, rider.id);
        } else {
          // Notify dispatcher: unassigned delivery
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
      const outlets = await db.query.rstOutlets.findMany();
      const now = new Date();
      const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      for (const outlet of outlets) {
        const hours = outlet.operatingHours?.[dayOfWeek];
        if (!hours) continue;
        if (currentTime < hours.open && outlet.status === "open") {
          await db.update(rstOutlets).set({ status: "closed" }).where(eq(rstOutlets.id, outlet.id));
        }
        if (currentTime >= hours.open && currentTime <= hours.close && outlet.status === "closed") {
          await db.update(rstOutlets).set({ status: "open" }).where(eq(rstOutlets.id, outlet.id));
        }
      }
    },
  });

  // Ingredient reorder alerts — daily 8AM
  scheduler.register({
    name: "rst.reorder-alerts",
    cron: "0 8 * * *",
    fn: async () => {
      const lowStock = await db.query.rstIngredients.findMany({
        where: lte(rstIngredients.currentStock, rstIngredients.reorderLevel),
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
