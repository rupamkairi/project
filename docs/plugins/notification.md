# Notification Plugin

Reusable fullstack plugin for sending email notifications using Handlebars templates, direct SMTP, and scheduled delivery.

**Packages:**
- `@projectx/plugin-notification-server` — Elysia plugin, SMTP delivery, template engine
- `@projectx/plugin-notification-web` — API clients for templates, scheduled sends, direct send

→ Plugin system overview: [README.md](./README.md)

---

## Features

- Direct email sending via SMTP (nodemailer)
- Template-based emails using Handlebars
- Scheduled notifications with in-memory queue
- System templates: welcome, password-reset, user-invite, plain
- Development mode: logs emails instead of sending

---

## Architecture

```
Client (browser)
  │ POST /send-template → variables + templateKey
  ▼
Server (Elysia plugin)
  ├─ loads .hbs template file
  ├─ renders with Handlebars
  └─ sends via SMTP (or queues if scheduledAt set)
      ▼
  SMTP server (nodemailer)
  In-memory queue (scheduled sends)
```

### Component structure

```
plugins/notification/
├── server/
│   └── src/
│       ├── index.ts           ← createNotificationPlugin(config) factory
│       ├── types.ts
│       ├── routes/
│       │   ├── templates.ts   ← template CRUD
│       │   └── scheduled.ts   ← scheduled message management
│       ├── lib/
│       │   ├── email.ts       ← SMTP email sender (nodemailer)
│       │   ├── template.ts    ← Handlebars engine
│       │   └── queue.ts       ← scheduled queue (in-memory)
│       └── templates/email/   ← .hbs template files
└── web/
    └── src/
        ├── index.ts
        └── lib/api.ts         ← templatesApi, scheduledApi, sendApi
```

---

## Integration

### Environment variables

```env
NOTIFICATION_EMAIL_FROM_ADDRESS="noreply@yourdomain.com"
NOTIFICATION_EMAIL_FROM_NAME="Your App Name"

# SMTP config (leave empty for dev mode — emails will be logged)
NOTIFICATION_SMTP_HOST="smtp.mailtrap.io"
NOTIFICATION_SMTP_PORT="587"
NOTIFICATION_SMTP_USER="your-user"
NOTIFICATION_SMTP_PASS="your-password"

# Set false to log emails instead of sending (development)
MAILER_ENABLED=false
```

### Server

**1. Add dependency:**
```json
// composes/{name}/server/package.json
{
  "dependencies": {
    "@projectx/plugin-notification-server": "workspace:*"
  }
}
```

**2. Register plugin:**
```typescript
import { createNotificationPlugin } from "@projectx/plugin-notification-server";

const notification = createNotificationPlugin({
  email: {
    fromAddress: process.env.NOTIFICATION_EMAIL_FROM_ADDRESS || "noreply@projectx.dev",
    fromName: process.env.NOTIFICATION_EMAIL_FROM_NAME || "ProjectX",
    smtp: process.env.NOTIFICATION_SMTP_HOST ? {
      host: process.env.NOTIFICATION_SMTP_HOST,
      port: parseInt(process.env.NOTIFICATION_SMTP_PORT || "587"),
      user: process.env.NOTIFICATION_SMTP_USER,
      pass: process.env.NOTIFICATION_SMTP_PASS,
    } : undefined,
  },
  queue: { enabled: true },
});

export const myCompose = new Elysia({ prefix: "/myname" })
  .use(authRoutes)
  .use(notification.plugin);
```

### Web

**1. Add dependency:**
```json
// composes/{name}/web/package.json
{
  "dependencies": {
    "@projectx/plugin-notification-web": "workspace:*"
  }
}
```

**2. Use API clients:**
```typescript
import { templatesApi, scheduledApi, sendApi } from "@projectx/plugin-notification-web";

// Send a direct email
await sendApi.send({
  to: "user@example.com",
  subject: "Hello",
  body: "<p>Content</p>",
});

// Send a template-based email
await sendApi.sendTemplate({
  to: "user@example.com",
  templateKey: "welcome",
  variables: [
    { key: "name", value: "John" },
    { key: "company", value: "Acme" },
  ],
});
```

---

## REST API Reference

All endpoints prefixed with `/platform/plugin-notifications`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/send` | Send direct email |
| POST | `/send-template` | Send template-based email |
| GET | `/templates` | List all templates |
| GET | `/templates/:key` | Get template |
| POST | `/templates` | Create template |
| PATCH | `/templates/:key` | Update template |
| DELETE | `/templates/:key` | Delete template (system templates protected) |
| GET | `/scheduled` | List scheduled messages |
| GET | `/scheduled/:id` | Get scheduled message |
| POST | `/scheduled` | Create scheduled message |
| PATCH | `/scheduled/:id` | Update scheduled message |
| DELETE | `/scheduled/:id` | Cancel scheduled message |

### POST `/send`

```json
// Request
{ "to": "user@example.com", "subject": "Hello", "body": "<p>Body</p>", "from": "Optional Name <name@domain.com>" }

// Response
{ "success": true, "messageId": "smtp_123" }
```

### POST `/send-template`

```json
// Request
{
  "to": "user@example.com",
  "templateKey": "welcome",
  "variables": [{ "key": "name", "value": "John" }],
  "scheduledAt": 1705312200000
}

// Response
{ "success": true, "messageId": "scheduled_123", "scheduledAt": 1705312200000 }
```

### POST `/templates`

```json
// Request
{
  "key": "order-confirmation",
  "subject": "Order #{{orderId}} Confirmed",
  "body": "<h1>Thanks!</h1><p>Order: {{orderId}}</p>"
}

// Response
{ "template": { "key": "order-confirmation", ... }, "created": true }
```

---

## Programmatic API (server-side)

```typescript
const { sendEmail, sendFromTemplate } = notification;

await sendEmail({
  to: "user@example.com",
  subject: "Hello",
  body: "<p>Test</p>",
});

await sendFromTemplate({
  to: "user@example.com",
  templateKey: "welcome",
  variables: [{ key: "name", value: "John" }],
  scheduledAt: Date.now() + 3600000, // optional
});
```

---

## Web client API

```typescript
import { templatesApi, scheduledApi, sendApi } from "@projectx/plugin-notification-web";

// Templates
await templatesApi.list();
await templatesApi.get("welcome");
await templatesApi.create({ key: "my-template", subject: "Hi {{name}}", body: "<p>Hello {{name}}!</p>" });
await templatesApi.update("my-template", { body: "<p>Updated</p>" });
await templatesApi.delete("my-template");

// Scheduled
await scheduledApi.list({ status: "pending" });
await scheduledApi.create({ templateKey: "welcome", recipient: "user@example.com", variables: [...], scheduledAt: ... });
await scheduledApi.update("scheduled_1_123", { scheduledAt: Date.now() + 7200000 });
await scheduledApi.delete("scheduled_1_123");

// Send
await sendApi.send({ to: "...", subject: "...", body: "..." });
await sendApi.sendTemplate({ to: "...", templateKey: "...", variables: [...] });
```

---

## Template system

### Template files

Place `.hbs` files in: `plugins/notification/server/src/templates/email/`

```
templates/email/
├── welcome.hbs              ← body
├── welcome.subject.hbs      ← subject (optional, overrides subject field)
├── user-invite.hbs
├── user-invite.subject.hbs
├── password-reset.hbs
└── plain.hbs
```

### Handlebars syntax

```html
<!-- welcome.hbs -->
<h1>Welcome, {{name}}!</h1>
<p>Thanks for joining {{company}}.</p>
```

### Available helpers

| Helper | Example | Output |
|---|---|---|
| `{{uppercase text}}` | `{{uppercase name}}` | JOHN |
| `{{lowercase text}}` | `{{lowercase email}}` | user@example.com |
| `{{capitalize text}}` | `{{capitalize name}}` | John |
| `{{date date}}` | `{{date createdAt}}` | 1/15/2024 |
| `{{time date}}` | `{{time createdAt}}` | 10:30:00 AM |
| `{{default value fallback}}` | `{{default name "User"}}` | User (if name empty) |
| `{{eq a b}}` | `{{eq role "admin"}}` | true/false |
| `{{ne a b}}` | `{{ne status "active"}}` | true/false |
| `{{gt a b}}` | `{{gt count 5}}` | true/false |
| `{{lt a b}}` | `{{lt count 10}}` | true/false |

### System templates (cannot be deleted)

- `welcome` — welcome new users
- `user-invite` — invitation emails
- `password-reset` — password reset
- `plain` — plain text fallback

---

## Types

```typescript
interface NotificationPluginConfig {
  email?: {
    fromAddress: string;
    fromName: string;
    smtp?: { host: string; port: number; user: string; pass: string; };
  };
  queue?: { enabled: boolean; };
}

interface Template {
  key: string;
  channel: string;
  subject?: string;
  body: string;
  locale: string;
  isSystem: boolean;
}

interface TemplateVariable { key: string; value: string; }

interface ScheduledMessage {
  id: string;
  templateKey: string;
  recipient: string;
  variables: TemplateVariable[];
  scheduledAt: number;
  status: "pending" | "sent" | "cancelled";
}
```

---

## SMTP providers

| Provider | Host | Port |
|---|---|---|
| Gmail | smtp.gmail.com | 587 |
| Mailgun | smtp.mailgun.org | 587 |
| SendGrid | smtp.sendgrid.net | 587 |
| Mailtrap (dev) | smtp.mailtrap.io | 587 / 2525 |

> Gmail requires an "App Password" if 2FA is enabled.

---

## Development mode

Set `MAILER_ENABLED=false` — emails are logged to console instead of sent:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 EMAIL (Development Mode - Not Sent)
From: Your App <noreply@yourapp.com>
To: user@example.com
Subject: Welcome!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<h1>Hello John!</h1>
```

---

## Production notes

- Scheduled messages use in-memory storage — not durable across server restarts. For production, add a DB table + message queue (BullMQ, RabbitMQ).
- Templates are file-based. For dynamic templates, store in DB.
- Always validate template variables before sending.
- Include unsubscribe links in promotional emails (legal requirement).

---

## Errors

| Status | Message | Cause |
|---|---|---|
| 400 | Missing required fields | Invalid request body |
| 400 | scheduledAt must be in the future | Scheduled time has passed |
| 403 | Cannot delete system templates | Attempted to delete reserved template |
| 404 | Template not found | Template key doesn't exist |
| 400 | Can only modify pending messages | Tried to modify sent/cancelled message |
