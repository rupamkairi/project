# Compose Patterns Reference

Common patterns used when building Compose hooks, rules, and config.
Reference when writing Section 5 (Commands), Section 7 (Event Flow), and Section 11 (Business Rules).

---

## Hook Patterns

### Pattern 1 — Cross-module workflow trigger on entity state change

```typescript
compose.hook({
  on: '[module.entity.event]',           // e.g. 'order.completed'
  handler: async (event, ctx) => {
    await ctx.dispatch('workflow.startProcess', {
      templateId: 'TEMPLATE_ID',
      entityId: event.aggregateId,
      entityType: 'EntityName',
      variables: { key: event.payload.key },
    });
  },
});
```

Use when: an entity reaching a terminal state should kick off a multi-step process.

---

### Pattern 2 — Notification on event

```typescript
compose.hook({
  on: '[event.name]',
  handler: async (event, ctx) => {
    await ctx.dispatch('notification.send', {
      templateKey: 'template.key',
      to: event.payload.recipientId,       // actor ID
      variables: { ...event.payload },
      channel: 'in_app',                   // 'email'|'sms'|'push'|'whatsapp'|'in_app'
    });
  },
});
```

Use when: an event should notify a specific actor directly.

---

### Pattern 3 — Delayed job scheduling (follow-up, reminder)

```typescript
compose.hook({
  on: '[trigger.event]',
  handler: async (event, ctx) => {
    await ctx.queue.add(
      '[compose.job-name]',
      { entityId: event.aggregateId, ...event.payload },
      { delay: hours(24) },               // or minutes(30), days(3), etc.
    );
  },
});
```

Use when: something should happen X time after an event (reminders, follow-ups, expiry checks).

---

### Pattern 4 — Event filtering with `filter` predicate

```typescript
compose.hook({
  on: '[broad.event.pattern]',
  filter: (event) => event.payload.type === 'specific_value',
  handler: async (event, ctx) => { ... },
});
```

Use when: a module emits events of mixed types and you only want to react to a subset.

---

### Pattern 5 — Ledger posting on payment event

```typescript
compose.hook({
  on: 'payment.recorded',
  handler: async (event, ctx) => {
    await ctx.dispatch('ledger.postTransaction', {
      debitAccountId: ctx.config.accountsReceivableId,
      creditAccountId: ctx.config.revenueAccountId,
      amount: event.payload.amount,
      currency: event.payload.currency,
      reference: event.payload.invoiceId,
    });
  },
});
```

Use when: a business event should produce a double-entry ledger record.

---

### Pattern 6 — Inventory reservation on order creation

```typescript
compose.hook({
  on: 'order.created',
  handler: async (event, ctx) => {
    for (const item of event.payload.lineItems) {
      await ctx.dispatch('inventory.reserve', {
        variantId: item.variantId,
        qty: item.qty,
        orderId: event.aggregateId,
      });
    }
  },
});
```

---

### Pattern 7 — Real-time bridge forwarding

```typescript
compose.realtime({
  bridge: [
    {
      eventPattern: '[resource].*',
      toChannel: (e) => `org:${e.orgId}:[compose]:[resource]`,
    },
    {
      eventPattern: '[resource].assigned',
      toChannel: (e) => `org:${e.orgId}:actor:${e.payload.actorId}:inbox`,
      filter: (e) => e.source !== 'system',
    },
  ],
});
```

---

## Rule Templates

### Guard: field must exist

```typescript
{ field: 'entity.fieldName', op: 'exists' }
```

### Guard: field must be above threshold

```typescript
{ field: 'entity.amount.amount', op: 'gte', value: 10000 }
```

### Guard: actor must have role

```typescript
{ field: 'actor.roles', op: 'contains', value: 'role-name' }
```

### Guard: actor must own the record

```typescript
{ field: 'entity.ownerId', op: 'eq', value: { ref: 'actor.id' } }
```

### Guard: config threshold reference

```typescript
{ field: 'entity.value.amount', op: 'gte', value: { ref: 'config.highValueThreshold' } }
```

### Action: require approval

```typescript
{
  id: 'rule-id',
  scope: 'resource:action',
  condition: { ... },
  action: 'require-approval',
  approverRole: 'manager-role',
}
```

### Action: block

```typescript
{
  id: 'rule-id',
  scope: 'resource:action',
  guard: { field: 'entity.status', op: 'eq', value: 'active' },
  // no action = implicit block if guard fails
}
```

---

## Config Pattern

Each Compose has a typed config object injected into hooks via `ctx.config`:

```typescript
interface [ComposeName]Config {
  // thresholds
  highValueThreshold: number;
  reorderThreshold: number;

  // account IDs for ledger
  revenueAccountId: ID;
  accountsReceivableId: ID;

  // feature flags
  enablePostSaleOnboarding: boolean;
  enableLoyaltyProgram: boolean;

  // workflow template IDs (registered during boot)
  onboardingTemplateId: string;
  approvalTemplateId: string;
}
```

---

## FSM Action Vocabulary

When defining FSM `actions`, use these standardized names:

```
emit:[event.name]            → publish a DomainEvent
notify:[template-key]        → dispatch notification.send
start:[workflow-template-id] → dispatch workflow.startProcess
queue:[job-name]             → push to Queue
lock:[field]                 → set entity.fieldName = lockedAt (timestamp)
```

---

## Scheduler Job Pattern

```typescript
compose.schedule({
  id: '[compose.job-name]',
  cron: '0 8 * * *',       // 8AM daily; or '*/30 * * * *' for every 30min
  handler: async (ctx) => {
    // Use ctx.repo, ctx.dispatch, ctx.publish
    // Always emit at least one event for observability
  },
});
```

---

## API Error Response Convention

All routes return structured errors:

```typescript
// 400 Bad Request
{ ok: false, code: 'VALIDATION_FAILED', failures: [{ field, message }] }

// 401 Unauthorized
{ ok: false, code: 'UNAUTHENTICATED' }

// 403 Forbidden
{ ok: false, code: 'UNAUTHORIZED', required: 'resource:action' }

// 404 Not Found
{ ok: false, code: 'NOT_FOUND', entity: 'EntityName', id }

// 409 Conflict
{ ok: false, code: 'CONFLICT', message }

// 422 Business Rule Violation
{ ok: false, code: 'BUSINESS_RULE_VIOLATED', ruleId, message }
```

---

## Paginated Response Convention

```typescript
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

Query params: `?page=1&limit=20&sort=createdAt:desc&filter[status]=active`
