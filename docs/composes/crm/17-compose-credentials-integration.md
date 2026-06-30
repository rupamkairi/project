# CRM — Phase 17: Compose Credentials & Integration Config

## Goal

Document every configuration point between the CRM compose, the platform shell, environment variables, and the login card — so any new compose can be wired correctly from the start.

---

## 17.1 Port Architecture

| Process | Port | Env var |
|---------|------|---------|
| API server (`apps/server`) | `10050` | `PORT` in `apps/server/src/infra/env.ts` (default `10050`) |
| Vite dev server (`apps/web`) | `10060` | `VITE_PORT` in `.env` |

These are **different processes on different ports.** Vite does not proxy to the API server unless explicitly configured. It is NOT configured.

**Rule:** All API calls from web composes must use the full server URL — never a relative path like `/crm/...`. Relative paths go to Vite (10060) and return 404.

---

## 17.2 The `VITE_API_URL` Env Var

Set in `.env` at repo root:

```env
VITE_API_URL=http://localhost:10050
```

This is read by `import.meta.env.VITE_API_URL` in all web composes at build/dev time.

### How each compose uses it

**Platform web** (`composes/platform/web/src/lib/api/platform.ts`):
```typescript
const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/platform";
```

**CRM web** (`composes/crm/web/src/lib/api.ts`):
```typescript
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/crm";
```

**Pattern for any new compose** (e.g. ecommerce):
```typescript
const BASE = (import.meta.env.VITE_API_URL || "http://localhost:3000") + "/<compose-prefix>";
```

### TypeScript declarations

Each compose's `web/src/` must have a `vite-env.d.ts`:
```typescript
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly [key: string]: string | boolean | undefined;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

Without this, `import.meta.env.VITE_API_URL` is typed as `any` and TypeScript warns.

---

## 17.3 Auth Token Flow

1. User logs in at `/login` via `platformApi.login(email, password)`
2. Server returns `{ token, sessionId }` — token stored in `localStorage.getItem("platform_token")`
3. All API clients read `localStorage.getItem("platform_token")` and send as `Authorization: Bearer <token>`
4. Auth plugin (`plugins/auth/server/src/middleware.ts`) — registered `{ as: "global" }` — runs on every route, resolves the token to an `actor` context object
5. Route handlers access `(ctx as any).actor` to get `{ id, orgId, roles, permissions }`

### Token key

```typescript
localStorage.getItem("platform_token")  // ← exact key used by all composes
```

If a compose uses a different key, auth silently fails (401 on all routes).

---

## 17.4 Actor Context in Handlers

The `actor` object set by the auth plugin:

```typescript
interface Actor {
  id: string;       // "actor_crm_admin"
  orgId: string;    // "org_platform_default"
  email: string;
  roles: string[];  // ["plt_role_crm-admin"]
  permissions: string[];  // ["crm:*"]
}
```

Handlers access it via the mediator command/query:
- Commands: `cmd.actorId` and `cmd.orgId`
- Queries: `q.actorId` and `q.orgId`

Both are set by the route factory:
```typescript
const actor = (ctx as any).actor;
mediator.dispatch({ type: "...", actorId: actor?.id, orgId: actor?.orgId, ... });
```

If `actor` is undefined (unauthenticated), `orgId` is undefined → DB queries silently return empty results (no org match). The auth plugin returns 401 before handlers run for properly protected routes.

---

## 17.5 Platform Login Card — Dev Credentials

File: `composes/platform/web/src/routes/auth/login.tsx`

The dev credentials card shows all known dev users across all composes. Update it when adding users for a new compose.

Current state (Platform + CRM):
```tsx
<div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground space-y-2">
  <p className="font-medium text-foreground">Dev credentials</p>

  <div className="space-y-0.5">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Platform</p>
    <p>
      <span className="font-mono text-foreground">dev@platform.local</span>
      <span className="mx-1.5 opacity-40">/</span>
      <span className="font-mono text-foreground">dev123</span>
    </p>
  </div>

  <div className="space-y-0.5">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CRM</p>
    <p>crm-admin@platform.local / crm123 (admin)</p>
    <p>crm-rep@platform.local / crm123 (rep)</p>
    <p>crm-viewer@platform.local / crm123 (viewer)</p>
  </div>
</div>
```

When adding a new compose (e.g. ecommerce), add a new `<div class="space-y-0.5">` block with its section label and credentials.

---

## 17.6 Vite Alias for New Compose Web Package

File: `apps/web/vite.config.ts`

When adding a new compose's web package, add its alias:

```typescript
const composes = {
  platform: "../../composes/platform/web/src",
  crm: "../../composes/crm/web/src",         // ← CRM
  // ecommerce: "../../composes/ecommerce/web/src",  // ← add new composes here
};

resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
    "@projectx/platform-web": path.resolve(__dirname, composes.platform),
    "@projectx/crm-web": path.resolve(__dirname, composes.crm),
    "@projectx/ui": path.resolve(__dirname, packages.ui),
  },
},
```

Also add to `apps/web/tsconfig.json` paths and `apps/web/package.json` dependencies (`workspace:*`).

---

## 17.7 Server Shell Registration for New Compose

File: `apps/server/src/index.ts`

Pattern (dynamic import avoids circular deps at boot):

```typescript
const { createCrmCompose } = await import("@projectx/crm-server");
const crmCompose = createCrmCompose(mediator, bus, bootRegistry.scheduler);
```

Then mount:
```typescript
new Elysia()
  .use(platformCompose)
  .use(crmCompose)
  // .use(ecommerceCompose)   ← new compose goes here
```

Also add the compose's tsconfig path to `apps/server/tsconfig.json`:
```json
"@projectx/crm-server": ["../../composes/crm/server/src/index.ts"],
"@projectx/crm-server/*": ["../../composes/crm/server/src/*"]
```

And its DB schema re-export to `apps/server/src/infra/db/schema/index.ts`:
```typescript
// CRM detail tables only — masters (persons, parties, pipelines, etc.) are in foundation modules
import { crmLeads, crmDeals, crmSegments, crmCampaigns, crmCampaignContacts, crmEmailThreads, crmEmailMessages }
  from "@projectx/crm-server/db/schema";
export { crmLeads, crmDeals, crmSegments, crmCampaigns, crmCampaignContacts, crmEmailThreads, crmEmailMessages };
```

Without this re-export, Drizzle doesn't know about the CRM detail tables and `db:push` won't create them.
Do not re-export `crmContacts`, `crmAccounts`, `crmPipelines`, `crmActivities` — those tables do not exist in the CRM compose.

---

## 17.8 CRM Compose `createCrmCompose` Signature

```typescript
export function createCrmCompose(mediator: Mediator, bus: EventBus, scheduler: Scheduler)
```

All three args are required. Passing only `mediator` (old scaffold signature) silently fails — search sync and jobs don't register.

Call site in `apps/server/src/index.ts`:
```typescript
const crmCompose = createCrmCompose(mediator, bus, bootRegistry.scheduler);
```
