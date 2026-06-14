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
| Auth | `@projectx/plugin-auth` | — | `createAuthPlugin()` | Planned |
| Payment | `@projectx/plugin-payment` | — | `createPaymentPlugin()` | Planned |
| Search | `@projectx/plugin-search` | — | `createSearchPlugin()` | Planned |

---

## Plugin docs

- [storage.md](./storage.md) — S3-compatible file uploads, metadata, REST API
- [notification.md](./notification.md) — Email templates, SMTP, scheduled sends
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
