# Plugin System

Plugins are reusable infrastructure capability packages. They sit between vendor SDKs and the compose layer.  
They are never hardwired into modules or core.

---

## Architecture position

```
core/               ← defines adapter interfaces (no implementations)
modules/            ← depends on core only; resolves providers at runtime via registry
plugins/            ← wraps vendors behind core interfaces; exports create{X}Plugin() factory
composes/           ← calls plugin factory at boot; only place modules and plugins meet
```

A plugin package:
- Imports only from `@core` interfaces and its own provider implementations
- Exports a single `create{X}Plugin(config)` factory function
- Never imports from modules, other plugins, or compose

A module:
- Never imports from a plugin package
- Resolves the active provider at runtime via a registry

The compose is the **only** place modules and plugins meet.

---

## Plugin package structure

```
plugins/
  {capability}/
    server/                  ← Elysia server plugin package
      src/
        index.ts             ← createXPlugin(config) factory
        types.ts             ← TypeScript interfaces
        routes/              ← REST endpoints
        lib/                 ← vendor-specific implementation
      package.json           ← name: "@projectx/plugin-{capability}-server"
    web/                     ← React components & API client
      src/
        index.ts             ← exports
        lib/api.ts           ← typed API client
        components/          ← React components
      package.json           ← name: "@projectx/plugin-{capability}-web"
```

---

## Available plugins

| Plugin | Server Package | Web Package | Factory | Status |
|---|---|---|---|---|
| Storage | `@projectx/plugin-storage-server` | `@projectx/plugin-storage-web` | `createStoragePlugin()` | Implemented |
| Notification | `@projectx/plugin-notification-server` | `@projectx/plugin-notification-web` | `createNotificationPlugin()` | Implemented |
| Auth | `@projectx/plugin-auth-server` | `@projectx/plugin-auth-web` | `createAuthPlugin()` | Documented |
| Logging | `@projectx/plugin-logging-server` | — | `createLoggingPlugin()` | Documented |
| Security | `@projectx/plugin-security-server` | — | `createSecurityPlugin()` | Documented |
| Payment | `@projectx/plugin-payment-server` | `@projectx/plugin-payment-web` | `createPaymentPlugin()` | Implemented |
| Jobs | `@projectx/plugin-jobs-server` | — | `createJobsPlugin()` | Planned |
| Search | built-in (PostgreSQL FTS) | — | `createPgSearchAdapter()` | Implemented |

**Status key:** Implemented = code exists · Documented = spec complete, not yet coded · Planned = on roadmap

---

## Plugin docs

- [auth.md](./auth.md) — JWT middleware, session resolution, provider adapters, web hooks
- [logging.md](./logging.md) — Structured request logging, log shipping (Datadog, Logtail, Axiom)
- [security.md](./security.md) — Security headers, rate limiting, CORS, IP access control
- [storage.md](./storage.md) — S3-compatible file uploads, metadata, REST API
- [notification.md](./notification.md) — Email templates, SMTP, scheduled sends
- [payment.md](./payment.md) — Stripe and Razorpay checkout, webhooks, refunds
- [development.md](./development.md) — How to build a new plugin

---

## How compose uses a plugin

```typescript
// composes/{name}/server/src/index.ts

import { createStoragePlugin } from "@projectx/plugin-storage-server";
import { createNotificationPlugin } from "@projectx/plugin-notification-server";

const storage = createStoragePlugin({ s3: { ... } });
const notification = createNotificationPlugin({ email: { ... } });

export const myCompose = new Elysia({ prefix: "/myname" })
  .use(storage.plugin)
  .use(notification.plugin);
```

Each compose can configure different providers. Different orgs within one compose can route to different providers via org settings resolved at runtime.
