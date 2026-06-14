# Naming Conventions

Single source of truth for naming across the entire codebase.
When in doubt, refer here. No exceptions without updating this doc.

---

## 1. Directories

| Type | Rule | Examples |
|------|------|---------|
| Homogeneous collection | **plural noun** | `entities/` `commands/` `queries/` `events/` `routes/` `components/` `hooks/` `jobs/` `adapters/` |
| Abstract namespace | **singular noun** | `lib/` `core/` `infra/` `config/` `types/` |
| Conceptual group | **singular noun** | `fsm/` `cqrs/` `queue/` `state/` `realtime/` |

**Rule of thumb:** If every file inside is the same type → plural. If it's a mixed toolbox → singular.

---

## 2. Source Files

| Type | Rule | Examples |
|------|------|---------|
| TypeScript module / util | `kebab-case.ts` | `auth-guard.ts` `api-client.ts` `env.ts` |
| React component | `kebab-case.tsx` | `sidebar.tsx` `auth-guard.tsx` |
| TanStack route file | `{segment}.{child}.tsx` | `dashboard.users.tsx` `dashboard.layout.tsx` |
| Barrel / entry | `index.ts` always | — |
| Test | `{name}.test.ts` | `identity.test.ts` |
| Schema (Drizzle) | `{name}.schema.ts` or in `schema/` dir | `platform.schema.ts` |
| Seed | `{name}.seed.ts` or in `seed/` dir | `platform.seed.ts` |

---

## 3. Doc Files

| Type | Rule | Examples |
|------|------|---------|
| Root entry docs | `UPPERCASE.md` | `AGENTS.md` `README.md` `ARCHITECTURE.md` |
| Architecture reference | `lowercase-kebab.md` | `core.md` `module.md` `compose.md` |
| Compose catalog entries | `{name}.md` inside `docs/composes/` | `crm.md` `erp.md` `lms.md` |
| Setup guides | `{subject}.md` inside `docs/setup/` | `server.md` `web.md` |
| AI agent plans | `{task-slug}.{agent}.plan.md` inside `plans/` | `add-crm-compose.claude.plan.md` |

---

## 4. HTTP API Routes (Elysia)

**Resource routes — plural noun** (a route that handles a collection):

```
GET    /users          ← list
POST   /users          ← create
GET    /users/:id      ← single item
PATCH  /users/:id      ← update
DELETE /users/:id      ← delete
```

**Action / concept routes — singular or verb**:

```
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /health
GET    /metrics
```

**Route file naming** follows the same rule:
- Resource file → plural: `users.ts`, `roles.ts`, `notifications.ts`, `settings.ts`
- Concept file → singular: `auth.ts`, `health.ts`

**Compose prefix** is always singular: `/platform/...`, `/crm/...`, `/erp/...`

---

## 5. Web Page Routes (TanStack Router)

Same rule as API routes:

| Route | Type |
|-------|------|
| `/users` | list page → plural |
| `/users/$id` | detail page → plural segment |
| `/dashboard` | concept → singular |
| `/settings` | concept → singular (but it's also a collection) |

TanStack file naming: `{parent}.{segment}.tsx`

```
dashboard.layout.tsx
dashboard.users.tsx
dashboard.users.$id.tsx
dashboard.roles.tsx
```

---

## 6. TypeScript Exports

| What | Pattern | Examples |
|------|---------|---------|
| Elysia plugin (compose) | `{name}Compose` | `platformCompose` `crmCompose` |
| Elysia app type (compose) | `{Name}App` | `PlatformApp` `CrmApp` |
| Route array | `{name}Routes` | `platformRoutes` `crmRoutes` |
| Compose manifest | `{name}Manifest` | `platformManifest` `crmManifest` |
| Module object | `{Name}Module` | `IdentityModule` `CatalogModule` |
| React component | `PascalCase` | `AuthGuard` `Sidebar` |
| React hook | `use{Name}` | `useAuth` `useSession` |
| Zustand store | `use{Name}Store` | `useAuthStore` |
| API client | `{name}Api` | `platformApi` `crmApi` |
| Server shell app | `app` | always lowercase singleton |
| Combined App type | `App` | from `apps/server/src/index.ts` |

---

## 7. Database (Drizzle)

**Drizzle object name:** `{prefix}{PascalCaseEntity}`
- Prefix = 3 lowercase letters from compose name
- `plt` = platform, `crm` = CRM, `erp` = ERP, `lms` = LMS, `pm` = PM

```typescript
// platform compose
export const pltSettings = pgTable("plt_settings", { ... })
export const pltComposeConfig = pgTable("plt_compose_config", { ... })

// crm compose
export const crmContact = pgTable("crm_contacts", { ... })
export const crmDeal = pgTable("crm_deals", { ... })
```

**SQL table name:** `{prefix}_{snake_case_entity}` — always plural.

| Drizzle object | SQL table |
|----------------|-----------|
| `crmContact` | `crm_contacts` |
| `erpPurchaseOrder` | `erp_purchase_orders` |
| `pltSettings` | `plt_settings` (already plural concept) |

---

## 8. Package Names

| Type | Pattern | Examples |
|------|---------|---------|
| Compose server | `@projectx/{name}-server` | `@projectx/platform-server` |
| Compose web | `@projectx/{name}-web` | `@projectx/platform-web` |
| Shared package | `@projectx/{name}` | `@projectx/ui` `@projectx/config` |
| Shared router | `@projectx/shared-router` | fixed name |

---

## 9. IDs and Identifiers

| What | Rule | Examples |
|------|------|---------|
| Module ID | lowercase singular noun | `identity` `catalog` `inventory` |
| Compose ID | lowercase singular noun | `platform` `crm` `erp` `lms` |
| Route prefix | lowercase singular noun | `/platform` `/crm` `/erp` |
| Package scope | `@projectx` | fixed |

---

## 10. Singular vs Plural — Decision Tree

```
Is it a collection where every item is the same type?
  YES → plural  (entities/, commands/, users.ts route)
  NO  → is it an abstract concept / toolbox?
        YES → singular  (lib/, core/, auth.ts route)
        NO  → does it represent a named thing (singleton)?
              YES → singular  (manifest.ts, index.ts, schema.ts)
```
