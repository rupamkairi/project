# Notification Plugin

A reusable fullstack plugin for sending email notifications using templates. Supports direct emails, template-based rendering with Handlebars, and scheduled notifications.

## Features

- Direct email sending via SMTP
- Template-based emails using Handlebars
- Scheduled notifications
- In-memory message queue
- System templates (welcome, password-reset, user-invite)

## Quick Start

### 1. Server Integration

Add dependency to your compose server:

```json
// composes/{name}/server/package.json
{
  "dependencies": {
    "@projectx/plugin-notification-server": "workspace:*"
  }
}
```

Register the plugin:

```typescript
// composes/{name}/server/src/index.ts
import { Elysia } from "elysia";
import { createNotificationPlugin } from "@projectx/plugin-notification-server";

const notificationPlugin = createNotificationPlugin({
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

export const {name}Compose = new Elysia({ prefix: "/{name}" })
  .use(authRoutes)
  .use(userRoutes)
  .use(notificationPlugin.plugin);
```

### 2. Web Integration

Add dependency to your compose web:

```json
// composes/{name}/web/package.json
{
  "dependencies": {
    "@projectx/plugin-notification-web": "workspace:*"
  }
}
```

Use the API client:

```typescript
// composes/{name}/web/src/lib/notifications.ts
import { templatesApi, sendApi } from "@projectx/plugin-notification-web";

// Send a template-based email
await sendApi.sendTemplate({
  to: "user@example.com",
  templateKey: "welcome",
  variables: [
    { key: "name", value: "John" },
    { key: "company", value: "Acme Inc" },
  ],
});

// Create a custom template
await templatesApi.create({
  key: "order-confirmation",
  subject: "Order #{{orderId}} Confirmed",
  body: "<h1>Thank you!</h1><p>Order ID: {{orderId}}</p>",
});
```

### 3. Environment Variables

```env
# Email Configuration
NOTIFICATION_EMAIL_FROM_ADDRESS="noreply@yourdomain.com"
NOTIFICATION_EMAIL_FROM_NAME="Your App Name"

# SMTP (optional - leave empty for dev mode)
NOTIFICATION_SMTP_HOST="smtp.mailtrap.io"
NOTIFICATION_SMTP_PORT="587"
NOTIFICATION_SMTP_USER="your-user"
NOTIFICATION_SMTP_PASS="your-password"

# Development mode (logs emails instead of sending)
MAILER_ENABLED=false
```

---

## API Reference

### REST Endpoints

All endpoints are prefixed with `/platform/plugin-notifications`

| Method | Endpoint          | Description               |
| ------ | ----------------- | ------------------------- |
| POST   | `/send`           | Send direct email         |
| POST   | `/send-template`  | Send template-based email |
| GET    | `/templates`      | List templates            |
| GET    | `/templates/:key` | Get template              |
| POST   | `/templates`      | Create template           |
| PATCH  | `/templates/:key` | Update template           |
| DELETE | `/templates/:key` | Delete template           |
| GET    | `/scheduled`      | List scheduled messages   |
| GET    | `/scheduled/:id`  | Get scheduled message     |
| POST   | `/scheduled`      | Create scheduled message  |
| PATCH  | `/scheduled/:id`  | Update scheduled message  |
| DELETE | `/scheduled/:id`  | Cancel scheduled message  |

---

#### POST `/send`

Send a direct email.

**Request:**

```json
{
  "to": "user@example.com",
  "subject": "Hello World",
  "body": "<p>Email body</p>",
  "from": "Sender <sender@example.com>"
}
```

**Response:**

```json
{
  "success": true,
  "messageId": "smtp_123"
}
```

---

#### POST `/send-template`

Send an email using a template.

**Request:**

```json
{
  "to": "user@example.com",
  "templateKey": "welcome",
  "variables": [
    { "key": "name", "value": "John" },
    { "key": "company", "value": "Acme" }
  ],
  "scheduledAt": 1705312200000
}
```

**Response:**

```json
{
  "success": true,
  "messageId": "scheduled_123",
  "scheduledAt": 1705312200000
}
```

---

#### GET `/templates`

List all templates.

**Response:**

```json
{
  "templates": [
    { "key": "welcome", "channel": "email" },
    { "key": "user-invite", "channel": "email" }
  ]
}
```

---

#### POST `/templates`

Create a template.

**Request:**

```json
{
  "key": "custom-template",
  "subject": "Hello {{name}}!",
  "body": "<h1>Welcome {{name}}!</h1>"
}
```

**Response:**

```json
{
  "template": { "key": "custom-template", ... },
  "created": true
}
```

---

#### GET `/scheduled`

List scheduled messages.

**Query:** `?status=pending`

**Response:**

```json
{
  "scheduled": [
    {
      "id": "scheduled_1_123",
      "templateKey": "welcome",
      "recipient": "user@example.com",
      "variables": [{ "key": "name", "value": "John" }],
      "scheduledAt": 1705312200000,
      "status": "pending"
    }
  ]
}
```

---

### Programmatic API

```typescript
const { sendEmail, sendFromTemplate } = notificationPlugin;

// Send direct email
const result = await sendEmail({
  to: "user@example.com",
  subject: "Hello",
  body: "<p>Test</p>",
});

// Send template email
const result = await sendFromTemplate({
  to: "user@example.com",
  templateKey: "welcome",
  variables: [{ key: "name", value: "John" }],
  scheduledAt: Date.now() + 3600000, // 1 hour from now
});
```

---

### Web Client

```typescript
import {
  templatesApi,
  scheduledApi,
  sendApi,
} from "@projectx/plugin-notification-web";

// Send email
await sendApi.send({
  to: "user@example.com",
  subject: "Hello",
  body: "<p>Content</p>",
});

// Send template email
await sendApi.sendTemplate({
  to: "user@example.com",
  templateKey: "welcome",
  variables: [{ key: "name", value: "John" }],
});

// List templates
const { data } = await templatesApi.list();

// Create template
await templatesApi.create({
  key: "my-template",
  subject: "Hi {{name}}",
  body: "<p>Hello {{name}}!</p>",
});

// Schedule message
await scheduledApi.create({
  templateKey: "welcome",
  recipient: "user@example.com",
  variables: [{ key: "name", value: "John" }],
  scheduledAt: Date.now() + 86400000, // tomorrow
});
```

---

## Types

```typescript
interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

interface TemplateVariable {
  key: string;
  value: string;
}

interface SendNotificationParams {
  to: string;
  templateKey: string;
  variables: TemplateVariable[];
  channel?: "email";
  scheduledAt?: number;
}

interface Template {
  key: string;
  channel: string;
  subject?: string;
  body: string;
  locale: string;
  isSystem: boolean;
}

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

## Template System

### Template Files

Place templates in: `plugins/notification/server/src/templates/email/`

```
templates/email/
├── welcome.hbs
├── welcome.subject.hbs
├── user-invite.hbs
├── password-reset.hbs
└── plain.hbs
```

### Syntax

Use Handlebars for variable interpolation:

```html
<h1>Welcome, {{name}}!</h1>
<p>Your email: {{email}}</p>
```

### Available Helpers

| Helper                       | Example                   | Output        |
| ---------------------------- | ------------------------- | ------------- |
| `{{uppercase text}}`         | `{{uppercase name}}`      | JOHN          |
| `{{lowercase text}}`         | `{{lowercase email}}`     | user@test.com |
| `{{capitalize text}}`        | `{{capitalize name}}`     | John          |
| `{{date date}}`              | `{{date createdAt}}`      | 1/15/2024     |
| `{{default value fallback}}` | `{{default name "User"}}` | User          |
| `{{eq a b}}`                 | `{{eq role "admin"}}`     | true/false    |

### System Templates

These templates are reserved and cannot be deleted:

- `welcome` - Welcome emails
- `user-invite` - Invitation emails
- `password-reset` - Password reset
- `plain` - Plain text template

---

## SMTP Configuration

### Development

Set `MAILER_ENABLED=false` to log emails instead of sending.

### Production

Configure SMTP:

```typescript
const notification = createNotificationPlugin({
  email: {
    fromAddress: "noreply@yourapp.com",
    fromName: "Your App",
    smtp: {
      host: "smtp.gmail.com",
      port: 587,
      user: "your-user",
      pass: "your-app-password",
    },
  },
});
```

### Common Providers

| Provider | Host              | Port |
| -------- | ----------------- | ---- |
| Gmail    | smtp.gmail.com    | 587  |
| Mailgun  | smtp.mailgun.org  | 587  |
| SendGrid | smtp.sendgrid.net | 587  |
| Mailtrap | smtp.mailtrap.io  | 587  |

---

## Error Handling

```typescript
const result = await sendApi.sendTemplate({
  to: "user@example.com",
  templateKey: "welcome",
  variables: [{ key: "name", value: "John" }],
});

if (!result.data.success) {
  console.error("Failed:", result.data.error);
}
```

### Common Errors

| Status | Error                             |
| ------ | --------------------------------- |
| 400    | Missing required fields           |
| 400    | scheduledAt must be in the future |
| 403    | Cannot delete system templates    |
| 404    | Template not found                |
