Here is the **`platform` Compose** — the dashboard composition for the architecture itself, scoped only to what you asked for.

---

```
Compose ID:   platform
Version:      1.0.0
Purpose:      The management layer for the architecture platform itself.
              Handles who can access the system and how they are notified.
Apps Served:  PlatformAdmin  → user management, roles, notification templates
              AuthGateway    → login, registration, session lifecycle
```

---

## 1. Module Selection

```typescript
const PlatformCompose: ComposeDefinition = {
  id: "platform",
  name: "Platform Dashboard",
  modules: ["identity", "notification"],

  moduleConfig: {
    identity: {
      allowSelfRegistration: false, // invite-only — admins create users
      requireEmailVerification: true,
      sessionTTLSeconds: 60 * 60 * 8, // 8-hour session window
      maxSessionsPerActor: 3,
    },
    notification: {
      defaultChannel: "email",
      supportedChannels: ["email", "in_app"],
      templateEngine: "handlebars",
    },
  },
};
```

---

## 2. Actor Roles & Permission Matrix

| Role              | Who                                        | Scope            |
| ----------------- | ------------------------------------------ | ---------------- |
| `platform-admin`  | Owns the platform deployment               | Global           |
| `platform-ops`    | Manages users and templates, no sys config | Org-scoped       |
| `platform-viewer` | Read-only access — auditing                | Org-scoped, read |

```
Format: ✓ allowed  —  denied  ◑ own-only

                            platform-admin    platform-ops    platform-viewer
─────────────────────────────────────────────────────────────────────────────
actor:create                    ✓                 ✓                  —
actor:read                      ✓                 ✓                  ✓
actor:update                    ✓                 ✓                  —
actor:suspend                   ✓                 —                  —
actor:delete                    ✓                 —                  —

role:create                     ✓                 —                  —
role:read                       ✓                 ✓                  ✓
role:assign                     ✓                 ✓                  —

session:read                    ✓                 ◑                  —
session:revoke                  ✓                 ◑                  —

notification.template:create    ✓                 ✓                  —
notification.template:read      ✓                 ✓                  ✓
notification.template:update    ✓                 ✓                  —
notification.template:delete    ✓                 —                  —

notification.log:read           ✓                 ✓                  ✓
notification.trigger:create     ✓                 —                  —
notification.trigger:read       ✓                 ✓                  ✓

settings:read                   ✓                 ✓                  ✓
settings:update                 ✓                 —                  —
```

---

## 3. Actor FSM

Identical to the identity module's Actor FSM. No overrides needed.

```
pending ──(activate)──► active ──(suspend)──► suspended
                            ▲                     │
                            └────(reactivate)─────┘
                                       │
                                   (delete)
                                       ▼
                                   deleted
```

Invite flow:

```
pending ──(accept)──► accepted
   │
   └──(expire / revoke)──► terminal
```

---

## 4. API Surface

### Auth

```
POST   /auth/login                → identity.login
POST   /auth/logout               → identity.logout
POST   /auth/refresh              → identity.refreshSession
POST   /auth/register             → identity.register        (admin only — no self-signup)
POST   /auth/verify-email         → identity.activate
POST   /auth/forgot-password      → identity.requestPasswordReset
POST   /auth/reset-password       → identity.resetPassword
GET    /auth/me                   → identity.getActor(sessionToken)
```

### Users

```
GET    /users                     → identity.listActors(orgId, filter)
POST   /users/invite              → identity.inviteActor
GET    /users/:id                 → identity.getActor(id)
PATCH  /users/:id                 → identity.updateActor(id)
POST   /users/:id/suspend         → identity.suspendActor(id)
POST   /users/:id/activate        → identity.activateActor(id)
DELETE /users/:id                 → identity.deleteActor(id)
GET    /users/:id/sessions        → identity.listSessions(actorId)
DELETE /users/:id/sessions/:sid   → identity.revokeSession(sid)
```

### Roles

```
GET    /roles                     → identity.listRoles(orgId)
POST   /roles                     → identity.createRole
GET    /roles/:id                 → identity.getRole(id)
PATCH  /roles/:id                 → identity.updateRole(id)
POST   /users/:id/roles           → identity.assignRole(actorId, roleId)
DELETE /users/:id/roles/:roleId   → identity.revokeRole(actorId, roleId)
```

### Notification Templates

```
GET    /notifications/templates            → notification.listTemplates(orgId)
POST   /notifications/templates            → notification.createTemplate
GET    /notifications/templates/:id        → notification.getTemplate(id)
PUT    /notifications/templates/:id        → notification.updateTemplate(id)
DELETE /notifications/templates/:id        → notification.deleteTemplate(id)
POST   /notifications/templates/:id/preview → render template with sample payload
```

### Notification Triggers & Logs

```
GET    /notifications/triggers             → notification.listTriggers(orgId)
POST   /notifications/triggers            → notification.createTrigger
DELETE /notifications/triggers/:id        → notification.deleteTrigger(id)

GET    /notifications/logs                → notification.getLog(orgId, filter)
POST   /notifications/send                → notification.send(templateKey, to, vars) [admin-only]
```

---

## 5. Event → Notification Trigger Map

| Event                  | Template Key               | Channel        | Recipient        |
| ---------------------- | -------------------------- | -------------- | ---------------- |
| `actor.registered`     | `actor.welcome`            | email          | The new actor    |
| `actor.invite.sent`    | `actor.invite`             | email          | Invited email    |
| `actor.password-reset` | `actor.password-reset`     | email          | Requesting actor |
| `actor.suspended`      | `actor.suspended`          | email + in_app | Suspended actor  |
| `actor.activated`      | `actor.activated`          | email          | Actor            |
| `notification.failed`  | `system.notification-fail` | in_app         | `platform-admin` |

---

## 6. Notification Templates (Seed)

```typescript
[
  {
    key: "actor.welcome",
    channel: "email",
    subject: "Welcome to {{orgName}}",
    body: "Hi {{firstName}}, your account on {{orgName}} has been created. Click here to get started: {{loginUrl}}",
    locale: "en",
    is_system: true,
  },
  {
    key: "actor.invite",
    channel: "email",
    subject: "You've been invited to {{orgName}}",
    body: "{{invitedByName}} invited you to join {{orgName}}. Accept before {{expiresAt}}: {{inviteUrl}}",
    locale: "en",
    is_system: true,
  },
  {
    key: "actor.password-reset",
    channel: "email",
    subject: "Reset your password",
    body: "You requested a password reset. This link expires in 30 minutes: {{resetUrl}}",
    locale: "en",
    is_system: true,
  },
  {
    key: "actor.suspended",
    channel: "email",
    subject: "Your account has been suspended",
    body: "Your account on {{orgName}} has been suspended. Contact your administrator for details.",
    locale: "en",
    is_system: true,
  },
  {
    key: "actor.activated",
    channel: "email",
    subject: "Your account is now active",
    body: "Your account on {{orgName}} has been reactivated. Log in here: {{loginUrl}}",
    locale: "en",
    is_system: true,
  },
  {
    key: "system.notification-fail",
    channel: "in_app",
    body: "Notification delivery failed for template {{templateKey}} → {{recipientEmail}}. Check logs.",
    locale: "en",
    is_system: true,
  },
];
```

---

## 7. Real-Time Channels

| Channel                             | Subscribers      | Events                                   |
| ----------------------------------- | ---------------- | ---------------------------------------- |
| `org:{orgId}:actors`                | `platform-admin` | `actor.*`, `role.*`, `invite.*`          |
| `org:{orgId}:actor:{actorId}:inbox` | The actor        | `notification.sent`, `actor.suspended`   |
| `org:{orgId}:platform:system`       | `platform-admin` | `notification.failed`, `session.revoked` |

---

## 8. Integrations

```typescript
PlatformCompose.integrations = {
  email: [ResendAdapter], // transactional email — welcome, invites, password reset
};
```

No payment, no storage, no geo. Only email transport.

---

## 9. Seed Data

```typescript
// Roles — platform-specific
[
  {
    name: "platform-admin",
    is_system: true,
    permissions: ["*:*"],
  },
  {
    name: "platform-ops",
    is_system: true,
    permissions: [
      "actor:create", "actor:read", "actor:update",
      "role:read", "role:assign",
      "session:read", "session:revoke",
      "notification.template:create", "notification.template:read",
      "notification.template:update",
      "notification.trigger:read",
      "notification.log:read",
      "settings:read",
    ],
  },
  {
    name: "platform-viewer",
    is_system: true,
    permissions: [
      "actor:read", "role:read",
      "notification.template:read",
      "notification.trigger:read",
      "notification.log:read",
      "settings:read",
    ],
  },
]

// Bootstrap actor — assign platform-admin role
{
  email:     "admin@platform.local",
  firstName: "Platform",
  lastName:  "Admin",
  type:      "human",
  status:    "active",
}
```

---

## 10. Module Wiring Summary

```
identity
  ├── actor.registered  ──────────────────────► notification.createTrigger → actor.welcome (email)
  ├── invite.sent  ───────────────────────────► notification.createTrigger → actor.invite (email)
  ├── actor.password-reset-requested  ────────► notification.createTrigger → actor.password-reset (email)
  ├── actor.suspended  ────────────────────────► notification.createTrigger → actor.suspended (email + in_app)
  └── actor.activated  ────────────────────────► notification.createTrigger → actor.activated (email)

notification
  └── notification.failed  ───────────────────► in_app push → platform-admin inbox
```

---

That covers the full architecture. The scope is intentionally tight — just `identity` and `notification`, two roles with a clear permission boundary, six email templates covering the full user lifecycle, and one system alert channel for the admin. Nothing else gets pulled in until you need it.
