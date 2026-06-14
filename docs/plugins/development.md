# Building a New Plugin

This guide covers how to create a new plugin for ProjectX, following the established plugin pattern.

→ Plugin system overview: [README.md](./README.md)  
→ Existing examples: [storage.md](./storage.md), [notification.md](./notification.md)

---

## The plugin pattern

Every plugin follows this shape regardless of capability:

| Capability | Package | Factory | Core Interface |
|---|---|---|---|
| Storage | `@projectx/plugin-storage-{server,web}` | `createStoragePlugin(config)` | `StorageAdapter` |
| Notification | `@projectx/plugin-notification-{server,web}` | `createNotificationPlugin(config)` | `NotificationChannelPlugin` |
| Auth | `@projectx/plugin-auth` | `createAuthPlugin(config)` | `AuthProviderPlugin` |
| Payment | `@projectx/plugin-payment` | `createPaymentPlugin(config)` | `PaymentAdapter` |
| Search | `@projectx/plugin-search` | `createSearchPlugin(config)` | `SearchAdapter` |

Same structure. Same dep rules. Different config and providers per capability.

---

## Dependency rules

```
core/                  ← define adapter interface here (no implementations)
modules/               ← resolve provider at runtime via registry; never import plugin
plugins/{capability}/  ← implement interface; never import modules
composes/{name}/       ← call factory at boot; ONLY place plugins and modules meet
```

**Violations:**
- A plugin importing from a module → forbidden
- A module importing from a plugin → forbidden
- A plugin importing from another plugin → forbidden

---

## Step-by-step

### 1. Define the interface in core

If the capability doesn't have a core interface yet, add one:

```typescript
// apps/server/src/core/adapters/payment-adapter.ts

export interface PaymentAdapter {
  charge(params: ChargeParams): Promise<ChargeResult>;
  refund(params: RefundParams): Promise<RefundResult>;
  getTransaction(id: string): Promise<Transaction>;
}
```

Register it in `AdapterRegistry` if it needs runtime resolution.

### 2. Create the plugin package structure

```bash
mkdir -p plugins/{capability}/server/src/{providers,routes,lib}
mkdir -p plugins/{capability}/web/src/{lib,components}
```

### 3. Write `package.json` for server and web

```json
// plugins/{capability}/server/package.json
{
  "name": "@projectx/plugin-{capability}-server",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "elysia": "workspace:*"
  },
  "devDependencies": {
    "@projectx/config": "workspace:*"
  }
}
```

```json
// plugins/{capability}/web/package.json
{
  "name": "@projectx/plugin-{capability}-web",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "react": "workspace:*"
  }
}
```

### 4. Write the factory function

```typescript
// plugins/{capability}/server/src/index.ts

import type { Elysia } from "elysia";
import type { CapabilityAdapter } from "@core/adapters/capability-adapter";

interface CapabilityPluginConfig {
  provider: "vendor-a" | "vendor-b";
  apiKey: string;
  // other config...
}

export function createCapabilityPlugin(config: CapabilityPluginConfig) {
  // 1. Select and instantiate provider
  const adapter: CapabilityAdapter =
    config.provider === "vendor-a"
      ? new VendorAAdapter(config)
      : new VendorBAdapter(config);

  // 2. Build Elysia plugin
  const plugin = new Elysia({ name: "plugin-capability" })
    .decorate("capability", adapter)
    .use(capabilityRoutes(adapter));

  // 3. Expose programmatic API + Elysia plugin
  return {
    plugin,
    doThing: (params: ThingParams) => adapter.doThing(params),
    doOtherThing: (params: OtherParams) => adapter.doOtherThing(params),
  };
}
```

### 5. Write provider implementations

```typescript
// plugins/{capability}/server/src/providers/vendor-a.ts

import type { CapabilityAdapter } from "@core/adapters/capability-adapter";
import VendorASDK from "vendor-a-sdk";

export class VendorAAdapter implements CapabilityAdapter {
  private client: VendorASDK;

  constructor(config: { apiKey: string }) {
    this.client = new VendorASDK({ apiKey: config.apiKey });
  }

  async doThing(params: ThingParams): Promise<ThingResult> {
    // wrap vendor SDK call
    return this.client.thing(params);
  }
}
```

### 6. Write REST routes

```typescript
// plugins/{capability}/server/src/routes/index.ts

import { Elysia, t } from "elysia";
import type { CapabilityAdapter } from "@core/adapters/capability-adapter";

export function capabilityRoutes(adapter: CapabilityAdapter) {
  return new Elysia({ prefix: "/plugin-capability" })
    .get("/things", async ({ query }) => {
      return adapter.listThings(query);
    })
    .post("/things", async ({ body }) => {
      return adapter.doThing(body);
    }, {
      body: t.Object({ ... }),
    });
}
```

### 7. Write the web API client

```typescript
// plugins/{capability}/web/src/lib/api.ts

export function createCapabilityApi(baseUrl: string) {
  const base = `${baseUrl}/platform/plugin-capability`;

  return {
    async listThings(params?: ListParams) {
      const url = new URL(`${base}/things`);
      if (params?.page) url.searchParams.set("page", String(params.page));
      const res = await fetch(url.toString());
      return res.json();
    },

    async doThing(body: ThingBody) {
      const res = await fetch(`${base}/things`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    },
  };
}
```

### 8. Export from web `index.ts`

```typescript
// plugins/{capability}/web/src/index.ts
export { createCapabilityApi } from "./lib/api";
export type { CapabilityApi, ThingResult } from "./lib/api";
export { CapabilityWidget } from "./components/capability-widget";
```

### 9. Write a README

Add `plugins/{capability}/README.md` — quick start, env vars, API reference.  
Then add a canonical doc to `docs/plugins/{capability}.md`.

### 10. Add to workspace glob (if needed)

If the glob `"plugins/*/server"` and `"plugins/*/web"` isn't in root `package.json` yet, add:

```json
// package.json
{
  "workspaces": [
    "apps/*",
    "composes/*/server",
    "composes/*/web",
    "packages/*",
    "plugins/*/server",
    "plugins/*/web"
  ]
}
```

---

## How compose consumes the plugin

```typescript
// composes/my-compose/server/src/index.ts
import { createCapabilityPlugin } from "@projectx/plugin-capability-server";

const capability = createCapabilityPlugin({
  provider: "vendor-a",
  apiKey: process.env.VENDOR_A_KEY,
});

export const myCompose = new Elysia({ prefix: "/my-compose" })
  .use(capability.plugin);
```

Different composes can use different providers. Same plugin package, different config.

---

## Checklist

- [ ] Core adapter interface defined in `apps/server/src/core/`
- [ ] Server package: `createXPlugin(config)` factory, `plugin` property (Elysia), programmatic methods
- [ ] Web package: typed API client, exported components
- [ ] No module imports in plugin package
- [ ] No plugin imports in module code
- [ ] `package.json` names follow `@projectx/plugin-{capability}-{server|web}` convention
- [ ] At least one provider implementation
- [ ] REST routes registered on plugin's Elysia instance
- [ ] `plugins/{capability}/README.md` written
- [ ] `docs/plugins/{capability}.md` canonical doc written
- [ ] Plugin listed in [docs/plugins/README.md](./README.md)
