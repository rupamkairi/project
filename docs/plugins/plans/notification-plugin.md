# Notification Plugin - Documentation

## Overview

The Notification Plugin is a reusable fullstack capability for sending email notifications using templates. It supports direct email sending, template-based rendering with Handlebars, and scheduled notifications.

---

## 1. Architecture

### 1.1 How It Fits Into the Architecture

The Notification Plugin follows the **Plugin Pattern**, sitting between Infrastructure and Compose layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE LAYERS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 3: COMPOSE  (platform)    → Integration & orchestration              │
│  Layer 2: PLUGIN   (notification) → Reusable notification capability       │
│  Layer 1: MODULE   (core)        → Domain primitives (future)              │
│  Layer 0: INFRA                 → SMTP, template engine                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Plugin vs Module

| Aspect       | Plugin                       | Module                   |
| ------------ | ---------------------------- | ------------------------ |
| **Purpose**  | Infrastructure capabilities  | Domain capabilities      |
| **Examples** | Storage, Notification, Email | User Management, Billing |
| **Location** | `plugins/*/`                 | `modules/*/`             |
| **Owned by** | Core/Infra team              | Domain teams             |

### 1.3 Component Structure

```
plugins/notification/
├── server/                    # Elysia server plugin
│   ├── src/
│   │   ├── index.ts           # Plugin factory (createNotificationPlugin)
│   │   ├── types.ts           # TypeScript interfaces
│   │   ├── routes/
│   │   │   ├── templates.ts   # Template CRUD endpoints
│   │   │   └── scheduled.ts  # Scheduled message endpoints
│   │   └── lib/
│   │       ├── email.ts       # SMTP email sender
│   │       ├── template.ts    # Handlebars template engine
│   │       └── queue.ts       # Queue handling (future)
│   └── package.json
│
└── web/                       # React components & API client
    ├── src/
    │   ├── index.ts           # Exports
    │   └── lib/
    │       └── api.ts        # NotificationApi, templatesApi, scheduledApi
    └── package.json
```

### 1.4 Data Flow

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Client   │────▶│  Server Routes  │────▶│    SMTP     │
│  (Browser) │     │  (Elysia)       │     │   Server    │
│            │◀────│                 │◀────│             │
└─────────────┘     └─────────────────┘     └─────────────┘
      │                     │
      │  1. Request         │  2. Send via SMTP
      │     send/           │
      │     send-template   │
      │                     │
      │  3. Render          ▼
      │     template   ┌─────────────┐
      │◀───────────────│  Handlebars │
      └────────────────│  Template   │
                       │  Engine     │
                       └─────────────┘
```

---

## 2. Integration Guide

### 2.1 Prerequisites

1. **SMTP Configuration**: Set environment variables for email delivery
2. **Template Files**: Place Handlebars templates in the plugin directory
3. **Plugin Registration**: Add to your compose's server and web

### 2.2 Environment Variables

Add to your `.env` file:

```env
# Notification - Email via SMTP
NOTIFICATION_EMAIL_FROM_ADDRESS="noreply@yourdomain.com"
NOTIFICATION_EMAIL_FROM_NAME="Your App Name"
NOTIFICATION_SMTP_HOST="smtp.mailtrap.io"
NOTIFICATION_SMTP_PORT="587"
NOTIFICATION_SMTP_USER="your-user"
NOTIFICATION_SMTP_PASS="your-password"

# Enable/disable actual email sending (development)
MAILER_ENABLED=false
```

### 2.3 Server Integration

**Step 1: Add dependency**

```json
// composes/{name}/server/package.json
{
  "dependencies": {
    "@projectx/plugin-notification-server": "workspace:*"
  }
}
```

**Step 2: Import and register plugin**

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
  queue: {
    enabled: true,
  }
});

export const {name}Compose = new Elysia({ prefix: "/{name}" })
  .use(authRoutes)
  .use(userRoutes)
  .use(notificationPlugin.plugin);
```

**Step 3: Export types (optional)**

```typescript
export {
  sendEmail,
  sendFromTemplate,
} from "@projectx/plugin-notification-server";
```

### 2.4 Web Integration

**Step 1: Add dependency**

```json
// composes/{name}/web/package.json
{
  "dependencies": {
    "@projectx/plugin-notification-web": "workspace:*"
  }
}
```

**Step 2: Import API clients**

```typescript
// composes/{name}/web/src/lib/notifications.ts
import {
  templatesApi,
  scheduledApi,
  sendApi,
} from "@projectx/plugin-notification-web";

// Re-export for convenience
export { templatesApi, scheduledApi, sendApi };
```

**Step 3: Use in components**

```tsx
import { templatesApi, sendApi } from "../lib/notifications";

// Send a template-based email
await sendApi.sendTemplate({
  to: "user@example.com",
  templateKey: "welcome",
  variables: [
    { key: "name", value: "John" },
    { key: "email", value: "user@example.com" },
  ],
});

// Get all templates
const { data } = await templatesApi.list();

// Create a new template
await templatesApi.create({
  key: "custom-notification",
  subject: "Hello {{name}}!",
  body: "<h1>Welcome, {{name}}!</h1><p>Thanks for joining us.</p>",
});
```

---

## 3. API Reference

### 3.1 Plugin API (Server-Side)

#### `createNotificationPlugin(config)`

Creates the notification plugin with email configuration.

```typescript
import { createNotificationPlugin } from "@projectx/plugin-notification-server";

const notification = createNotificationPlugin({
  email: {
    fromAddress: "noreply@yourapp.com",
    fromName: "Your App",
    smtp: {
      host: "smtp.mailtrap.io",
      port: 587,
      user: "user",
      pass: "pass",
    },
  },
  queue: {
    enabled: true,
  },
});
```

**Config Type:**

```typescript
interface NotificationPluginConfig {
  email?: {
    fromAddress: string;
    fromName: string;
    smtp?: {
      host: string;
      port: number;
      user: string;
      pass: string;
    };
  };
  queue?: {
    enabled: boolean;
  };
}
```

#### Programmatic Methods

```typescript
const { sendEmail, sendFromTemplate } = notification;

// Send direct email
const result = await sendEmail({
  to: "user@example.com",
  subject: "Hello",
  body: "<p>This is a test email</p>",
  from: "Custom Name <noreply@yourapp.com>",
});

// Send template-based email
const result = await sendFromTemplate({
  to: "user@example.com",
  templateKey: "welcome",
  variables: [
    { key: "name", value: "John" },
    { key: "company", value: "Acme Inc" },
  ],
  channel: "email",
  scheduledAt: Date.now() + 3600000, // Optional: schedule for 1 hour later
});
```

### 3.2 REST API Endpoints

All endpoints are prefixed with `/platform/plugin-notifications`

#### POST `/send`

Send a direct email without using a template.

**Request Body:**

```json
{
  "to": "user@example.com",
  "subject": "Hello World",
  "body": "<p>This is the email body</p>",
  "from": "Sender Name <sender@example.com>"
}
```

| Field   | Type   | Required | Description                 |
| ------- | ------ | -------- | --------------------------- |
| to      | string | Yes      | Recipient email address     |
| subject | string | Yes      | Email subject line          |
| body    | string | Yes      | Email body (HTML supported) |
| from    | string | No       | Custom sender address       |

**Response:**

```json
{
  "success": true,
  "messageId": "smtp_message_id_123"
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "Failed to send email"
}
```

---

#### POST `/send-template`

Send an email using a template.

**Request Body:**

```json
{
  "to": "user@example.com",
  "templateKey": "welcome",
  "variables": [
    { "key": "name", "value": "John" },
    { "key": "company", "value": "Acme Inc" }
  ],
  "scheduledAt": 1705312200000
}
```

| Field       | Type   | Required | Description                          |
| ----------- | ------ | -------- | ------------------------------------ |
| to          | string | Yes      | Recipient email address              |
| templateKey | string | Yes      | Template name (without .hbs)         |
| variables   | array  | Yes      | Array of { key, value } objects      |
| channel     | string | No       | Currently only "email"               |
| scheduledAt | number | No       | Unix timestamp for scheduled sending |

**Response:**

```json
{
  "success": true,
  "messageId": "scheduled_1705312200000",
  "scheduledAt": 1705312200000
}
```

---

#### GET `/templates`

List all available templates.

**Response:**

```json
{
  "templates": [
    { "key": "welcome", "channel": "email" },
    { "key": "user-invite", "channel": "email" },
    { "key": "password-reset", "channel": "email" }
  ]
}
```

---

#### GET `/templates/:key`

Get a specific template's content.

**Response:**

```json
{
  "template": {
    "key": "welcome",
    "channel": "email",
    "subject": "Welcome to {{company}}!",
    "body": "<h1>Hello {{name}}!</h1><p>Welcome to {{company}}.</p>"
  }
}
```

---

#### POST `/templates`

Create a new template.

**Request Body:**

```json
{
  "key": "order-confirmation",
  "subject": "Order Confirmed - {{orderId}}",
  "body": "<h1>Thank you for your order!</h1><p>Order ID: {{orderId}}</p>"
}
```

| Field   | Type   | Required | Description                        |
| ------- | ------ | -------- | ---------------------------------- |
| key     | string | Yes      | Unique template identifier         |
| subject | string | No       | Email subject (supports variables) |
| body    | string | Yes      | Email body (HTML with Handlebars)  |

**Response:**

```json
{
  "template": {
    "key": "order-confirmation",
    "channel": "email",
    "subject": "Order Confirmed - {{orderId}}",
    "body": "<h1>Thank you for your order!</h1><p>Order ID: {{orderId}}</p>"
  },
  "created": true
}
```

---

#### PATCH `/templates/:key`

Update an existing template.

**Request Body:**

```json
{
  "subject": "Updated Subject",
  "body": "<p>Updated body content</p>"
}
```

**Response:**

```json
{
  "updated": true
}
```

---

#### DELETE `/templates/:key`

Delete a template.

**Note:** System templates cannot be deleted (`user-invite`, `welcome`, `password-reset`, `plain`).

**Response:**

```json
{
  "deleted": true
}
```

**Error Response (system template):**

```json
{
  "error": "Cannot delete system templates"
}
```

---

#### GET `/scheduled`

List all scheduled messages.

**Query Parameters:**

| Parameter | Type   | Description                                |
| --------- | ------ | ------------------------------------------ |
| status    | string | Filter by status: pending, sent, cancelled |

**Response:**

```json
{
  "scheduled": [
    {
      "id": "scheduled_1_1705312200000",
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

#### GET `/scheduled/:id`

Get a specific scheduled message.

**Response:**

```json
{
  "scheduled": {
    "id": "scheduled_1_1705312200000",
    "templateKey": "welcome",
    "recipient": "user@example.com",
    "variables": [{ "key": "name", "value": "John" }],
    "scheduledAt": 1705312200000,
    "status": "pending"
  }
}
```

---

#### POST `/scheduled`

Create a scheduled message.

**Request Body:**

```json
{
  "templateKey": "welcome",
  "recipient": "user@example.com",
  "variables": [{ "key": "name", "value": "John" }],
  "scheduledAt": 1705312200000
}
```

| Field       | Type   | Required | Description                        |
| ----------- | ------ | -------- | ---------------------------------- |
| templateKey | string | Yes      | Template to use                    |
| recipient   | string | Yes      | Recipient email                    |
| variables   | array  | Yes      | Template variables                 |
| scheduledAt | number | Yes      | Unix timestamp (must be in future) |

**Response:**

```json
{
  "scheduled": {
    "id": "scheduled_1_1705312200000",
    "templateKey": "welcome",
    "recipient": "user@example.com",
    "variables": [{ "key": "name", "value": "John" }],
    "scheduledAt": 1705312200000,
    "status": "pending"
  },
  "created": true
}
```

---

#### PATCH `/scheduled/:id`

Update a scheduled message (only pending messages can be modified).

**Request Body:**

```json
{
  "scheduledAt": 1705400000000,
  "status": "cancelled"
}
```

**Response:**

```json
{
  "scheduled": {
    "id": "scheduled_1_1705312200000",
    "templateKey": "welcome",
    "recipient": "user@example.com",
    "variables": [{ "key": "name", "value": "John" }],
    "scheduledAt": 1705400000000,
    "status": "cancelled"
  },
  "updated": true
}
```

---

#### DELETE `/scheduled/:id`

Cancel a scheduled message.

**Response:**

```json
{
  "deleted": true
}
```

---

### 3.3 Web API Client

#### Available APIs

```typescript
import {
  templatesApi,
  scheduledApi,
  sendApi,
} from "@projectx/plugin-notification-web";
```

##### templatesApi

```typescript
// List all templates
const { data } = await templatesApi.list();

// Get a specific template
const { data } = await templatesApi.get("welcome");

// Create a template
const { data } = await templatesApi.create({
  key: "custom",
  subject: "Hello {{name}}",
  body: "<p>Welcome {{name}}!</p>",
});

// Update a template
const { data } = await templatesApi.update("custom", {
  subject: "Updated Subject",
  body: "<p>Updated body</p>",
});

// Delete a template
const { data } = await templatesApi.delete("custom");
```

##### scheduledApi

```typescript
// List scheduled messages (optionally filter by status)
const { data } = await scheduledApi.list({ status: "pending" });

// Get a specific scheduled message
const { data } = await scheduledApi.get("scheduled_1_123");

// Create a scheduled message
const { data } = await scheduledApi.create({
  templateKey: "welcome",
  recipient: "user@example.com",
  variables: [{ key: "name", value: "John" }],
  scheduledAt: Date.now() + 3600000,
});

// Update a scheduled message
const { data } = await scheduledApi.update("scheduled_1_123", {
  scheduledAt: Date.now() + 7200000,
});

// Cancel a scheduled message
const { data } = await scheduledApi.delete("scheduled_1_123");
```

##### sendApi

```typescript
// Send a direct email
await sendApi.send({
  to: "user@example.com",
  subject: "Hello",
  body: "<p>Email body</p>",
});

// Send a template-based email
await sendApi.sendTemplate({
  to: "user@example.com",
  templateKey: "welcome",
  variables: [{ key: "name", value: "John" }],
});
```

#### TypeScript Types

```typescript
// Exported from @projectx/plugin-notification-web

interface Template {
  key: string;
  channel: string;
  subject?: string;
  body: string;
  locale: string;
  isSystem: boolean;
}

interface TemplateVariable {
  key: string;
  value: string;
}

interface ScheduledMessage {
  id: string;
  templateKey: string;
  recipient: string;
  variables: TemplateVariable[];
  scheduledAt: number;
  status: "pending" | "sent" | "cancelled";
}

interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

interface SendTemplatePayload {
  to: string;
  templateKey: string;
  variables: TemplateVariable[];
  channel?: "email";
  scheduledAt?: number;
}
```

---

## 4. Template System

### 4.1 Template Files

Templates are stored as Handlebars (`.hbs`) files:

```
plugins/notification/server/src/templates/email/
├── welcome.hbs              # Body template
├── welcome.subject.hbs     # Subject template (optional)
├── user-invite.hbs
├── user-invite.subject.hbs
├── password-reset.hbs
├── password-reset.subject.hbs
└── plain.hbs
```

### 4.2 Template Syntax

Use Handlebars syntax for variable interpolation:

```handlebars
{{variableName}}
```

**Example:**

```html
<!-- welcome.hbs -->
<h1>Welcome, {{name}}!</h1>
<p>Thanks for joining {{company}}.</p>
<p>Your email is: {{email}}</p>
```

```handlebars
<!-- welcome.subject.hbs -->
Welcome to
{{company}}!
```

### 4.3 Available Helpers

The plugin includes several Handlebars helpers:

| Helper                       | Example                   | Output                  |
| ---------------------------- | ------------------------- | ----------------------- |
| `{{uppercase text}}`         | `{{uppercase name}}`      | JOHN                    |
| `{{lowercase text}}`         | `{{lowercase email}}`     | user@example.com        |
| `{{capitalize text}}`        | `{{capitalize name}}`     | John                    |
| `{{date date}}`              | `{{date createdAt}}`      | 1/15/2024               |
| `{{time date}}`              | `{{time createdAt}}`      | 10:30:00 AM             |
| `{{default value fallback}}` | `{{default name "User"}}` | User (if name is empty) |
| `{{eq a b}}`                 | `{{eq role "admin"}}`     | true/false              |
| `{{ne a b}}`                 | `{{ne status "active"}}`  | true/false              |
| `{{gt a b}}`                 | `{{gt count 5}}`          | true/false              |
| `{{lt a b}}`                 | `{{lt count 10}}`         | true/false              |

### 4.4 System Templates

The following templates are reserved and cannot be deleted:

- `user-invite` - Invitation emails
- `welcome` - Welcome new users
- `password-reset` - Password reset emails
- `plain` - Plain text template

---

## 5. Email Configuration

### 5.1 SMTP Setup

The plugin uses nodemailer for SMTP delivery:

```typescript
const notification = createNotificationPlugin({
  email: {
    fromAddress: "noreply@yourapp.com",
    fromName: "Your App Name",
    smtp: {
      host: "smtp.gmail.com", // or your SMTP host
      port: 587, // 465 for SSL, 587 for TLS
      user: "your-smtp-username",
      pass: "your-smtp-password",
    },
  },
});
```

### 5.2 Development Mode

Set `MAILER_ENABLED=false` in your environment to log emails instead of sending them:

```
MAILER_ENABLED=false
```

In development mode, emails are logged to the console:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 EMAIL (Development Mode - Not Sent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: Your App Name <noreply@yourapp.com>
To: user@example.com
Subject: Welcome!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<h1>Hello John!</h1>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5.3 Email Providers

**Gmail:**

- Host: `smtp.gmail.com`
- Port: `587` (TLS) or `465` (SSL)
- Note: Requires "App Password" if 2FA is enabled

**Mailgun:**

- Host: `smtp.mailgun.org`
- Port: `587` (TLS) or `465` (SSL)

**SendGrid:**

- Host: `smtp.sendgrid.net`
- Port: `587` (TLS) or `465` (SSL)

**Mailtrap (Development):**

- Host: `smtp.mailtrap.io`
- Port: `587` or `2525`

---

## 6. Security Considerations

1. **SMTP Credentials**: Store SMTP passwords in environment variables, never in code
2. **Rate Limiting**: Implement rate limiting for send endpoints in production
3. **Template Validation**: Validate template variables to prevent injection
4. **Email Spoofing**: Use DKIM/SPF when sending from custom domains
5. **Unsubscribe**: Include unsubscribe links in promotional emails (required by law)

---

## 7. Error Handling

### Common Errors

| Status | Message                           | Description                                |
| ------ | --------------------------------- | ------------------------------------------ |
| 400    | Missing required fields           | Invalid request body                       |
| 400    | scheduledAt must be in the future | Scheduled time has passed                  |
| 403    | Cannot delete system templates    | Attempted to delete reserved template      |
| 404    | Template not found                | Template key doesn't exist                 |
| 400    | Can only modify pending messages  | Attempted to modify sent/cancelled message |

### Email Send Errors

```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

## 8. Migration

The Notification Plugin does not require database migrations as it uses:

- **In-memory storage** for scheduled messages (development)
- **File-based storage** for templates

For production, consider:

- Adding database tables for scheduled messages
- Implementing a message queue (Bull, RabbitMQ)
- Storing templates in database

---

## 9. Best Practices

1. **Use Templates**: Always prefer template-based emails over direct sends for consistency
2. **Variable Validation**: Validate required template variables before sending
3. **Error Handling**: Always check the `success` field in responses
4. **Scheduled Messages**: Use scheduled sends for non-urgent notifications to reduce load
5. **Template Testing**: Test templates with sample data before deploying
6. **Email Prefers HTML**: Always use HTML body; plain text is fallback only
