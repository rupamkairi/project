# CRM — Phase 5: Integrations

## Goal

Wire all external capability plugins into the CRM compose. Organized by priority:
P0 = required for basic functionality, P1 = required for feature parity with Twenty,
P2 = enhances maturity. Each section describes the compose-level wiring, not the plugin
implementation itself (plugins live in `plugins/{capability}/`).

---

## 5.1 Search Integration (P0)

Plugin: `PgSearchAdapter` (built-in, registered at server boot — already done).

Compose wiring in `composes/crm/server/src/hooks/search-sync.ts`:

```typescript
// Register search sync for all searchable CRM entities
const searchAdapter = bootRegistry.adapters.get<SearchAdapter>("search");

const searchableEntities = [
  { collection: "Contact", events: ["crm.contact.created", "crm.contact.updated", "crm.contact.deleted"] },
  { collection: "Account", events: ["crm.account.created", "crm.account.updated", "crm.account.deleted"] },
  { collection: "Deal",    events: ["crm.deal.created",   "crm.deal.updated",   "crm.deal.deleted"] },
];

for (const { collection, events } of searchableEntities) {
  for (const eventType of events) {
    bus.on(eventType, async (event) => {
      await searchAdapter.sync(collection, event);
    });
  }
}
```

Route: `GET /crm/search?q=john+doe&collection=Contact&orgId=xxx`

Returns unified results across Contact, Account, Deal with `collection` field on each hit.

---

## 5.2 Notification Integration (P0)

Plugin: `@projectx/plugin-notification-server` — already implemented.

Compose wiring: register CRM-specific notification templates at boot.

File: `composes/crm/server/src/db/seed/notification-templates.seed.ts`

Templates to seed:

| Template ID | Trigger | Recipients | Content |
|-------------|---------|------------|---------|
| `crm.deal-won` | deal.won | Sales manager | "Deal {title} won by {ownerName}. Value: {value}." |
| `crm.deal-rotting` | job: check-deal-rotting | Deal owner | "Deal {title} has been in {stage} for {days} days." |
| `crm.follow-up-reminder` | job: follow-up-reminders | Activity owner | "Task due: {subject} — {dueAt}" |
| `crm.high-value-deal` | deal.created (high value) | Sales manager | "High-value deal {title} requires approval. Value: {value}." |
| `crm.campaign-complete` | campaign.sent | Campaign creator | "Campaign {name} delivered to {count} contacts." |
| `crm.lead-assigned` | lead.created (from import) | Assigned owner | "You've been assigned lead: {name} ({company})" |

Notification dispatch pattern (in hooks):

```typescript
await mediator.send({
  type: "notification.send",
  templateId: "crm.deal-won",
  recipientId: salesManagerActorId,
  channel: "email",
  context: { title: deal.title, ownerName: owner.name, value: formatMoney(deal.value) },
});
```

---

## 5.3 Email Sync Integration (P1)

Depends on `plugins/email-sync/` — a separate plugin not yet built.
This section defines the CRM compose's integration contract for when that plugin exists.

### AdapterType

`"email-sync"` — defined in Core (done). Interface: `EmailSyncAdapter` (connect, syncMessages, disconnect).

### Plugin registration pattern

```typescript
// composes/crm/server/src/index.ts
if (config.emailSync) {
  const emailSyncPlugin = createEmailSyncPlugin({
    provider: config.emailSync.provider, // "gmail" | "outlook"
    credentials: config.emailSync.credentials,
    onMessageReceived: async (message) => {
      await mediator.send({ type: "crm.ingestEmailMessage", message });
    },
  });
  bootRegistry.adapters.register("email-sync", emailSyncPlugin.adapter);
  app.use(emailSyncPlugin.plugin); // mounts /crm/email-sync/oauth routes
}
```

### Email ingestion hook

File: `composes/crm/server/src/hooks/email-ingest.ts`

```typescript
bus.on("email-sync.message.received", async (event) => {
  const message: EmailMessage = event.payload;

  // 1. Find contact by sender email
  let contact = await findContactByEmail(message.from);

  // 2. Auto-create contact if not found
  if (!contact) {
    contact = await mediator.send({
      type: "crm.createContact",
      email: message.from,
      source: "email-sync",
    });
  }

  // 3. Find or create email thread
  let thread = await findThread(message.threadId);
  if (!thread) {
    thread = await insertThread({ externalThreadId: message.threadId, contactId: contact.id, subject: message.subject });
  }

  // 4. Insert email message
  await insertEmailMessage({ threadId: thread.id, ...message });

  // 5. Log as CRM Activity
  await mediator.send({
    type: "crm.createActivity",
    type: "email",
    subject: message.subject,
    contactId: contact.id,
    direction: "inbound",
  });
});
```

### OAuth routes (mounted by plugin)

```
GET /crm/email-sync/oauth/connect?provider=gmail    — redirect to Google OAuth
GET /crm/email-sync/oauth/callback                  — OAuth callback; store credentials
DELETE /crm/email-sync/oauth/disconnect             — revoke and delete credentials
GET /crm/email-sync/status                          — sync status + last synced at
```

---

## 5.4 Calendar Sync Integration (P1)

Depends on `plugins/calendar-sync/` — not yet built.

### Plugin registration pattern

```typescript
if (config.calendarSync) {
  const calendarPlugin = createCalendarSyncPlugin({
    provider: config.calendarSync.provider,
    onEventReceived: async (calEvent) => {
      await mediator.send({ type: "crm.linkCalendarEvent", calEvent });
    },
  });
  bootRegistry.adapters.register("calendar-sync", calendarPlugin.adapter);
  app.use(calendarPlugin.plugin);
}
```

### Calendar event linking hook

```typescript
bus.on("calendar-sync.event.received", async (event) => {
  const calEvent: CalendarEvent = event.payload;

  // Match attendees to CRM contacts by email
  const contacts = await findContactsByEmails(calEvent.attendees);

  // Create Activity of type=meeting linked to matched contacts
  for (const contact of contacts) {
    await mediator.send({
      type: "crm.createActivity",
      activityType: "meeting",
      subject: calEvent.title,
      contactId: contact.id,
      dueAt: new Date(calEvent.startAt),
      durationSeconds: (calEvent.endAt - calEvent.startAt) / 1000,
    });
  }
});
```

---

## 5.5 Telephony Integration (P2)

Depends on `plugins/telephony/` — not yet built.

### Plugin registration pattern

```typescript
if (config.telephony) {
  const telephonyPlugin = createTelephonyPlugin({
    provider: "twilio",
    apiKey: config.telephony.apiKey,
    onCallCompleted: async (record) => {
      await mediator.send({ type: "crm.logCall", record });
    },
  });
  bootRegistry.adapters.register("telephony", telephonyPlugin.adapter);
  app.use(telephonyPlugin.plugin); // mounts webhook + click-to-call routes
}
```

### Click-to-call route

```
POST /crm/telephony/call
Body: { contactId, fromNumber }
→ adapter.initiateCall(contact.phone, fromNumber, webhookUrl)
→ returns { callId }
```

### Call log webhook hook

```typescript
bus.on("telephony.call.completed", async (event) => {
  const record: CallRecord = event.payload;

  // Find contact by phone number
  const contact = await findContactByPhone(record.to);

  // Create Activity of type=call
  await mediator.send({
    type: "crm.createActivity",
    activityType: "call",
    subject: `Call with ${contact?.firstName ?? record.to}`,
    contactId: contact?.id,
    direction: record.direction,
    durationSeconds: record.durationSeconds,
    callSid: record.id,
    callRecordingUrl: record.recordingUrl,
  });
});
```

---

## 5.6 Outbound Webhook System (P2)

Enables Zapier/n8n integration by broadcasting CRM events to registered URLs.

Table: `crm_webhooks` (simple: `id, orgId, url, events: text[], secret, isActive`).

File: `composes/crm/server/src/hooks/outbound-webhooks.ts`

```typescript
// Subscribe to all CRM events and fan out to registered URLs
const CRM_WEBHOOK_EVENTS = [
  "crm.contact.created", "crm.contact.updated",
  "crm.deal.created", "crm.deal.won", "crm.deal.lost",
  "crm.lead.converted",
  "crm.activity.created",
];

for (const eventType of CRM_WEBHOOK_EVENTS) {
  bus.on(eventType, async (event) => {
    const webhooks = await getActiveWebhooksForEvent(event.orgId, eventType);
    for (const webhook of webhooks) {
      await bootRegistry.queue.enqueue("crm.webhook.dispatch", { webhook, event });
    }
  });
}

// Worker: HMAC-sign and POST to registered URL
async function dispatchWebhook({ webhook, event }) {
  const body = JSON.stringify(event);
  const sig = createHmac("sha256", webhook.secret).update(body).digest("hex");
  await fetch(webhook.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CRM-Signature": sig },
    body,
  });
}
```
