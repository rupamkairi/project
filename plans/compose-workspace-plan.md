# Plan: Configure Compose as npm Workspace Packages

## Goal

Configure `composes/platform` as an npm workspace package that can be imported into `apps/server` and `apps/web`.

## Tasks

### 1. Update Root package.json

Add `composes/*` to workspaces array:

```json
"workspaces": [
  "apps/*",
  "composes/*"
]
```

### 2. Create composes/platform/package.json

Create a proper package.json with:

- Name: `@projectx/platform`
- Type: `module`
- Exports: Subpath exports for server and web
- Dependencies: Reference shared dependencies from root

### 3. Move Server Code

Move code from `apps/server/src/compose/platform/` to `composes/platform/server/`

### 4. Move Web Code

Keep web code in `composes/platform/web/` (already there)

### 5. Configure apps/server tsconfig.json

Add path alias:

```json
"paths": {
  "@projectx/platform": ["./node_modules/@projectx/platform/server"],
  "@projectx/platform/*": ["./node_modules/@projectx/platform/*"]
}
```

### 6. Configure apps/web tsconfig.json and vite.config.ts

Add path alias:

```json
"paths": {
  "@projectx/platform": ["./node_modules/@projectx/platform/web"],
  "@projectx/platform/*": ["./node_modules/@projectx/platform/*"]
}
```

And update vite.config.ts alias:

```ts
alias: {
  "@projectx/platform": path.resolve(__dirname, "./node_modules/@projectx/platform/web"),
}
```

### 7. Update imports in apps/server

Change imports from `./compose/platform` to `@projectx/platform/server`

### 8. Update imports in apps/web

Change imports to use `@projectx/platform/web`
