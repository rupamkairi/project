I am building a full-stack monorepo using Turborepo and Bun.
The architecture follows three layers: Core → Module → Compose.
The attached architecture documents are the source of truth — follow them exactly.

Do not invent structure. Do not add packages not listed here.
Do not add any feature logic to apps/server or apps/web — they are shells only.

---

## STEP 1 — Root Setup

Install Turborepo at the root:

bun add -D turbo

Create root `package.json` (if not already present):

{
"name": "repo",
"private": true,
"workspaces": [
"apps/*",
"composes/*/server",
"composes/*/web",
"packages/*"
],
"scripts": {
"dev": "turbo run dev",
"build": "turbo run build",
"check": "turbo run typecheck"
},
"devDependencies": {
"turbo": "latest"
}
}

Create root `tsconfig.json`:

{
"compilerOptions": {
"target": "ESNext",
"module": "ESNext",
"moduleResolution": "bundler",
"strict": true,
"skipLibCheck": true
}
}

Create `.gitignore` at root:

node_modules/
dist/
.turbo/
.env
.env.local

---

## STEP 2 — packages/config

This package is the tooling foundation for the entire monorepo.
Build this before any app or compose. Everything else extends from it.

Create packages/config/ with the following structure:

packages/config/
├── tsconfig/
│ ├── base.json
│ ├── server.json
│ ├── web.json
│ └── lib.json
├── eslint/
│ ├── base.js
│ ├── server.js
│ └── react.js
├── prettier.config.js
└── package.json

---

Create packages/config/package.json:

{
"name": "@repo/config",
"private": true,
"type": "module",
"exports": {
"./tsconfig/base": "./tsconfig/base.json",
"./tsconfig/server": "./tsconfig/server.json",
"./tsconfig/web": "./tsconfig/web.json",
"./tsconfig/lib": "./tsconfig/lib.json",
"./eslint/base": "./eslint/base.js",
"./eslint/server": "./eslint/server.js",
"./eslint/react": "./eslint/react.js",
"./prettier.config.js": "./prettier.config.js"
},
"devDependencies": {
"@eslint/js": "latest",
"typescript-eslint": "latest",
"eslint-plugin-react": "latest",
"eslint-plugin-react-hooks":"latest",
"typescript": "latest"
}
}

No build step. Exports raw .json and .js files directly.

---

Create packages/config/tsconfig/base.json:

{
"$schema": "https://json.schemastore.org/tsconfig",
"compilerOptions": {
"target": "ESNext",
"module": "ESNext",
"moduleResolution": "bundler",
"strict": true,
"skipLibCheck": true,
"resolveJsonModule": true,
"forceConsistentCasingInFileNames": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
"noFallthroughCasesInSwitch": true,
"exactOptionalPropertyTypes": true,
"sourceMap": true,
"declarationMap": true
}
}

Create packages/config/tsconfig/server.json:

{
"$schema": "https://json.schemastore.org/tsconfig",
"extends": "./base.json",
"compilerOptions": {
"lib": ["ESNext"],
"types": ["bun-types"],
"noEmit": false,
"outDir": "dist",
"declaration": true
}
}

NOTE: Path aliases (@core/_, @modules/_, etc.) are NOT declared here.
They are specific to each app or compose and declared in their own tsconfig.

Create packages/config/tsconfig/web.json:

{
"$schema": "https://json.schemastore.org/tsconfig",
"extends": "./base.json",
"compilerOptions": {
"lib": ["DOM", "DOM.Iterable", "ESNext"],
"jsx": "react-jsx",
"useDefineForClassFields": true,
"noEmit": true
}
}

NOTE: noEmit is true — Vite handles transpilation, tsc is for type checking only.

Create packages/config/tsconfig/lib.json:

{
"$schema": "https://json.schemastore.org/tsconfig",
"extends": "./base.json",
"compilerOptions": {
"lib": ["ESNext"],
"noEmit": false,
"outDir": "dist",
"declaration": true,
"declarationMap": true
}
}

---

Create packages/config/eslint/base.js:

import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export const base = tseslint.config(
js.configs.recommended,
...tseslint.configs.recommendedTypeChecked,
{
rules: {
'@typescript-eslint/no-explicit-any': 'error',
'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
'prefer-const': 'error',
'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
},
}
)

Create packages/config/eslint/server.js:

import { base } from './base.js'

export const server = [
...base,
{
rules: {
'no-console': 'off', // servers log by design
},
},
]

Create packages/config/eslint/react.js:

import { base } from './base.js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export const react = [
...base,
react.configs.flat.recommended,
{
plugins: { 'react-hooks': reactHooks },
rules: {
...reactHooks.configs.recommended.rules,
'react/react-in-jsx-scope': 'off',
'react/prop-types': 'off',
},
},
]

---

Create packages/config/prettier.config.js:

export default {
semi: false,
singleQuote: true,
trailingComma: 'all',
printWidth: 100,
tabWidth: 2,
}

---

## STEP 3 — turbo.json

Create `turbo.json` at root:

{
"$schema": "https://turbo.build/schema.json",
"tasks": {
"build": {
"dependsOn": ["^build"],
"outputs": ["dist/**"]
},
"dev": {
"dependsOn": ["^build"],
"cache": false,
"persistent": true
},
"typecheck": {
"dependsOn": ["^build"]
},
"lint": {
"dependsOn": ["^build"]
}
}
}

Build order Turbo infers from workspace dependencies:
packages/config → composes/_/server → composes/_/web → apps/server → apps/web

---

## STEP 4 — apps/server

Create the directory: apps/server/

Create apps/server/package.json:

{
"name": "@repo/server",
"private": true,
"scripts": {
"dev": "bun run --hot src/index.ts",
"start": "bun run src/index.ts",
"worker": "bun run src/worker.ts",
"worker:dev": "bun run --hot src/worker.ts",
"build": "bun build src/index.ts --outdir dist",
"typecheck": "tsc --noEmit",
"lint": "eslint .",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio",
"db:seed": "bun run src/infra/db/seed.ts"
},
"devDependencies": {
"@repo/config": "workspace:\*",
"bun-types": "latest",
"typescript": "latest",
"drizzle-kit": "latest",
"eslint": "latest"
}
}

Create apps/server/tsconfig.json:

{
"extends": "@repo/config/tsconfig/server",
"compilerOptions": {
"paths": {
"@core/_": ["./src/core/_"],
"@modules/_": ["./src/modules/_"],
"@infra/_": ["./src/infra/_"],
"@db/_": ["./src/infra/db/_"]
}
},
"include": ["src"],
"exclude": ["node_modules", "dist"]
}

Create apps/server/eslint.config.js:

import { server } from '@repo/config/eslint/server'
export default server

Create apps/server/prettier.config.js:

export { default } from '@repo/config/prettier.config.js'

Create the following folder structure inside apps/server/src/.
Each folder gets a placeholder index.ts — no logic, structure only.

core/
context/index.ts
cqrs/index.ts
entity/index.ts
errors/index.ts
event/index.ts
module/index.ts
primitives/index.ts
queue/index.ts
realtime/index.ts
repository/index.ts
rule/index.ts
state/index.ts
index.ts

infra/
cache/index.ts
db/
schema/
helpers.ts
identity.ts
catalog.ts
inventory.ts
ledger.ts
workflow.ts
scheduling.ts
document.ts
notification.ts
geo.ts
analytics.ts
events.ts
outbox.ts
index.ts
migrations/
client.ts
index.ts
queue/
client.ts
index.ts
realtime/
gateway.ts
index.ts
env.ts

modules/
analytics/
commands/index.ts
entities/index.ts
events/index.ts
fsm/index.ts
jobs/index.ts
queries/index.ts
index.ts
catalog/ (same structure)
document/ (same structure)
geo/ (same structure)
identity/ (same structure)
inventory/ (same structure)
ledger/ (same structure)
notification/ (same structure)
scheduling/ (same structure)
workflow/ (same structure)

Create apps/server/src/index.ts (shell only):

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { bearer } from '@elysiajs/bearer'

const app = new Elysia()
.use(cors())
.use(swagger())
.use(bearer())
.get('/health', () => ({ status: 'ok' }))
// Compose plugins registered here via .use() as composes are added
.listen(3000)

console.log(`Server running at ${app.server?.url}`)

export type App = typeof app

Create apps/server/src/worker.ts (shell only):

console.log('Worker starting...')
// Compose queue workers registered here as composes are added

Create apps/server/.env.example:

DATABASE_URL=
REDIS_URL=
PORT=3000
JWT_SECRET=

---

## STEP 5 — apps/web

Create the directory: apps/web/

Create apps/web/package.json:

{
"name": "@repo/web",
"private": true,
"scripts": {
"dev": "vite",
"build": "tsc && vite build",
"typecheck": "tsc --noEmit",
"preview": "vite preview",
"lint": "eslint ."
},
"dependencies": {
"@repo/server": "workspace:_"
},
"devDependencies": {
"@repo/config": "workspace:_",
"vite": "latest",
"@vitejs/plugin-react": "latest",
"typescript": "latest",
"@types/react": "latest",
"@types/react-dom": "latest",
"@tanstack/router-plugin": "latest",
"eslint": "latest"
}
}

Install runtime dependencies:

bun add react react-dom @tanstack/react-router @tanstack/react-query @elysiajs/eden

Create apps/web/tsconfig.json:

{
"extends": "@repo/config/tsconfig/web",
"include": ["src"],
"exclude": ["node_modules", "dist"]
}

Create apps/web/vite.config.ts:

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
plugins: [
TanStackRouterVite(),
react(),
],
server: {
port: 5173,
},
})

Create apps/web/eslint.config.js:

import { react } from '@repo/config/eslint/react'
export default react

Create apps/web/prettier.config.js:

export { default } from '@repo/config/prettier.config.js'

Create the following folder structure inside apps/web/src/.
Shell only — no feature components:

components/ ← shell layout components (nav, sidebar)
hooks/ ← shell hooks (auth session, theme)
lib/
utils.ts
routes/
\_\_root.tsx ← root layout
index.tsx ← entry redirect
main.tsx
router.ts

Create apps/web/src/main.tsx:

import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

ReactDOM.createRoot(document.getElementById('root')!).render(
<React.StrictMode>
<RouterProvider router={router} />
</React.StrictMode>
)

Create apps/web/src/router.ts (shell — compose routes added here as composes are built):

import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'
import { RootLayout } from './routes/\_\_root'

const rootRoute = createRootRoute({ component: RootLayout })

const indexRoute = createRoute({
getParentRoute: () => rootRoute,
path: '/',
component: () => null,
})

// Compose route arrays registered here via rootRoute.addChildren([...])
const routeTree = rootRoute.addChildren([indexRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
interface Register { router: typeof router }
}

---

## STEP 6 — composes/platform (first compose)

This compose implements Authentication & Users and the Notification System.
Modules used: identity, notification.

### composes/platform/server/

Create package.json:

{
"name": "@repo/platform-server",
"private": true,
"main": "src/index.ts",
"scripts": {
"build": "bun build src/index.ts --outdir dist",
"typecheck": "tsc --noEmit",
"dev": "bun run --hot src/index.ts",
"lint": "eslint ."
},
"devDependencies": {
"@repo/config": "workspace:\*",
"bun-types": "latest",
"typescript": "latest",
"eslint": "latest"
}
}

Create tsconfig.json:

{
"extends": "@repo/config/tsconfig/server",
"compilerOptions": {
"paths": {
"@core/_": ["../../../apps/server/src/core/_"],
"@modules/_": ["../../../apps/server/src/modules/_"],
"@infra/_": ["../../../apps/server/src/infra/_"],
"@db/_": ["../../../apps/server/src/infra/db/_"]
}
},
"include": ["src"],
"exclude": ["node_modules", "dist"]
}

Create eslint.config.js:

import { server } from '@repo/config/eslint/server'
export default server

Create prettier.config.js:

export { default } from '@repo/config/prettier.config.js'

Create folder structure inside composes/platform/server/src/:

hooks/ ← module event → command bridges
permissions/ ← role + permission matrix
index.ts
routes/
auth.ts ← POST /auth/login, /logout, /refresh, /register, etc.
users.ts ← GET/POST/PATCH/DELETE /users, /users/:id, /roles
notifications.ts← GET/POST/PUT/DELETE /notifications/templates, /triggers, /logs
index.ts ← aggregates all routes into one Elysia instance
seed/
index.ts ← platform roles + notification templates seed
index.ts ← exports platformCompose plugin + PlatformApp type

Create comoses/platform/server/src/index.ts:

import { Elysia } from 'elysia'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { notificationRoutes } from './routes/notifications'

export const platformCompose = new Elysia({ prefix: '/platform' })
.use(authRoutes)
.use(userRoutes)
.use(notificationRoutes)

export type PlatformApp = typeof platformCompose

Register in apps/server/src/index.ts:

import { platformCompose } from '@repo/platform-server'

const app = new Elysia()
.use(cors())
.use(swagger())
.use(bearer())
.use(platformCompose) // ← add this line
.get('/health', () => ({ status: 'ok' }))
.listen(3000)

export type App = typeof app

### composes/platform/web/

Create package.json:

{
"name": "@repo/platform-web",
"private": true,
"main": "src/routes/index.ts",
"scripts": {
"typecheck": "tsc --noEmit",
"lint": "eslint ."
},
"dependencies": {
"@repo/platform-server": "workspace:_"
},
"devDependencies": {
"@repo/config": "workspace:_",
"typescript": "latest",
"@types/react": "latest",
"eslint": "latest"
}
}

Create tsconfig.json:

{
"extends": "@repo/config/tsconfig/web",
"include": ["src"],
"exclude": ["node_modules", "dist"]
}

Create eslint.config.js:

import { react } from '@repo/config/eslint/react'
export default react

Create prettier.config.js:

export { default } from '@repo/config/prettier.config.js'

Create folder structure inside composes/platform/web/src/:

components/
auth/ ← Login form, reset password form
users/ ← User table, invite modal, role assignment
notifications/ ← Template editor, trigger config, log table
hooks/
use-auth.ts
use-users.ts
use-notifications.ts
lib/
api.ts ← Eden Treaty client using PlatformApp type
routes/
login.tsx
users.tsx
users.$id.tsx
notifications.tsx
notifications.templates.tsx
notifications.logs.tsx
index.ts ← exports platformRoutes array

Create comoses/platform/web/src/lib/api.ts:

import { treaty } from '@elysiajs/eden'
import type { PlatformApp } from '@repo/platform-server'

export const api = treaty<PlatformApp>(
import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
)

Create composes/platform/web/src/routes/index.ts:

import { createRoute } from '@tanstack/react-router'
// Import route components and define route objects here
// Export as: export const platformRoutes = [loginRoute, usersRoute, ...]

Register in apps/web/src/router.ts:

import { platformRoutes } from '@repo/platform-web'

const routeTree = rootRoute.addChildren([
...platformRoutes,
indexRoute,
])

---

## STEP 7 — Multi-Compose Wiring Conventions

These conventions must be followed for every compose added after the first.
Do not deviate. They solve route collisions, sidebar nav, Eden Treaty across
composes, and worker registration.

---

### 6a — Route Prefix (Web — prevents collisions)

Every compose web MUST declare a layout route at its own unique prefix.
The prefix is the compose name. It is never shared with another compose.

Pattern for every composes/{name}/web/src/routes/index.ts:

import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '@repo/web/root'

const {name}Layout = createRoute({
getParentRoute: () => rootRoute,
path: '/{name}', // unique prefix, hardcoded to compose name
component: {Name}Layout,
})

// child routes hang off {name}Layout, not off rootRoute
const featureARoute = createRoute({ getParentRoute: () => {name}Layout, path: '/feature-a' })
const featureBRoute = createRoute({ getParentRoute: () => {name}Layout, path: '/feature-b' })

export const {name}Routes = {name}Layout.addChildren([featureARoute, featureBRoute])

Register in apps/web/src/router.ts:

import { {name}Routes } from '@repo/{name}-web'

const routeTree = rootRoute.addChildren([
platformRoutes,
{name}Routes, // add one entry per new compose
indexRoute,
])

---

### 6b — Compose Manifest (Web — drives sidebar nav)

Every compose web MUST export a manifest. The manifest is the only way
apps/web knows what nav items to render. Never hardcode nav links in apps/web.

Pattern for every composes/{name}/web/src/manifest.ts:

import type { ComposeManifest } from '@repo/web/types'
import { SomeIcon } from 'lucide-react'

export const {name}Manifest: ComposeManifest = {
id: '{name}',
label: '{Display Name}',
icon: SomeIcon,
prefix: '/{name}',
navItems: [
{ label: 'Feature A', path: '/{name}/feature-a', icon: SomeIcon },
],
}

ComposeManifest type — create this once in apps/web/src/types/compose.ts:

export interface ComposeManifest {
id: string
label: string
icon: React.ComponentType
prefix: string
navItems: Array<{
label: string
path: string
icon: React.ComponentType
}>
}

Register in apps/web/src/lib/compose-registry.ts:

import { platformManifest } from '@repo/platform-web'
// import { {name}Manifest } from '@repo/{name}-web' // add one line per new compose

export const composeRegistry = [
platformManifest,
// {name}Manifest,
]

Sidebar component reads from registry — create apps/web/src/components/sidebar.tsx:

import { composeRegistry } from '../lib/compose-registry'
import { Link } from '@tanstack/react-router'

export function Sidebar() {
return (
<aside>
{composeRegistry.map(compose => (
<div key={compose.id}>
<p>{compose.label}</p>
{compose.navItems.map(item => (
<Link key={item.path} to={item.path}>{item.label}</Link>
))}
</div>
))}
</aside>
)
}

---

### 6c — Eden Treaty Strategy (two tiers)

TIER 1 — Scoped client. Every compose web has its own api client.
Used for all calls within that compose's own routes and hooks.

Pattern for every composes/{name}/web/src/lib/api.ts:

import { treaty } from '@elysiajs/eden'
import type { {Name}App } from '@repo/{name}-server'

export const api = treaty<{Name}App>(import.meta.env.VITE_API_URL)

TIER 2 — Combined client. apps/web has one client typed to the full App.
Used for shell-level concerns: auth session, global inbox, cross-compose calls.

apps/server/src/index.ts must export App after all compose plugins are registered:

import { platformCompose } from '@repo/platform-server'
// import { {name}Compose } from '@repo/{name}-server' // add per compose

const app = new Elysia()
.use(platformCompose)
// .use({name}Compose)
.listen(3000)

export type App = typeof app // combined type, all compose routes included

Create apps/web/src/lib/api.ts (combined shell client):

import { treaty } from '@elysiajs/eden'
import type { App } from '@repo/server'

export const api = treaty<App>(import.meta.env.VITE_API_URL)

RULE: when a compose web needs to call another compose's API, it imports the
combined client from '@repo/web/lib/api' — never from another compose directly.

---

### 6d — Worker Registration (Server)

Every compose server that has background jobs MUST export a registerWorkers function.
Every compose server that has NO background jobs simply omits it.

Pattern for composes/{name}/server/src/index.ts:

export const {name}Compose = new Elysia({ prefix: '/{name}' })
.use(...)

export type {Name}App = typeof {name}Compose

// Only export this if the compose has background jobs:
export function register{Name}Workers(queue: QueueClient) {
queue.process('{name}.job-key', jobHandler)
}

Register in apps/server/src/worker.ts:

// import { register{Name}Workers } from '@repo/{name}-server'
import { queue } from './infra/queue'

registerPlatformWorkers(queue)
// register{Name}Workers(queue) // add per compose that has workers

---

### 6e — Package Dependencies (Turbo graph)

When a new compose is added, declare its packages as dependencies so Turbo
infers the correct build order automatically.

Add to apps/server/package.json:

"dependencies": {
"@repo/platform-server": "workspace:_",
"@repo/{name}-server": "workspace:_" // one line per new compose server
}

Add to apps/web/package.json:

"dependencies": {
"@repo/server": "workspace:_",
"@repo/platform-web": "workspace:_",
"@repo/{name}-web": "workspace:\*" // one line per new compose web
}

Add to composes/{name}/web/package.json:

"dependencies": {
"@repo/{name}-server": "workspace:\*" // compose web depends on its own server
}

Turbo infers build order from these declarations:
composes/_/server -> composes/_/web -> apps/server -> apps/web

---

## STEP 8 — Verification

After all files are created, run from the repo root:

bun install # installs all workspace dependencies
bun run typecheck # all packages must pass with zero errors
bun run lint # all packages must pass with zero errors
bun run dev # both apps/server and apps/web start

Expected output:

- apps/server running at http://localhost:3000
- apps/web running at http://localhost:5173
- /health returns { "status": "ok" }
- /platform routes visible in Swagger at http://localhost:3000/swagger
- Sidebar renders platform nav items from composeRegistry

---

## HARD RULES — enforce throughout every file generated

1.  packages/config is built before any app or compose
2.  Every tsconfig.json extends from @repo/config — never from ../../tsconfig.json or root
3.  Every eslint.config.js imports from @repo/config — never declares its own rules
4.  Every prettier.config.js re-exports from @repo/config — never declares its own rules
5.  Path aliases (@core/_, @modules/_, etc.) are declared per-app only — never in packages/config
6.  apps/server and apps/web contain ZERO feature logic
7.  All feature logic lives in composes/
8.  No compose imports from another compose directly
9.  No compose imports from apps/ directories
10. core/ imports nothing from modules/, composes/, or infra/
11. modules/ imports from core/ and infra/ only — never from another module's internals
12. Each compose/web has a scoped Eden Treaty client typed to its own compose/server
13. Cross-compose API calls use the combined client from apps/web/src/lib/api.ts only
14. Every compose web exports BOTH a route tree AND a manifest — never one without the other
15. Every compose route tree is rooted at a layout route with a unique prefix path
16. Nav links are never hardcoded in apps/web — always driven by composeRegistry
17. Every infra connection (DB, Redis) must log clearly on failure and exit with code 1
18. No `any` — use `unknown` where type is truly unknown
19. No hardcoded strings for event types, command types, or entity names —
    all declared as constants in their module's index.ts
