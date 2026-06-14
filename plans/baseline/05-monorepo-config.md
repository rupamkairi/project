# 05 — Monorepo Config Alignment

**Source of truth:** `docs/monorepo-architecture.md`, `docs/architecture/project-setup-{server,web}.md`.
**Target:** root + per-workspace `package.json`, `tsconfig*`, `turbo.json`, eslint configs.

**Can start immediately, in parallel with everything.** Several items are BLOCKERs because they make `typecheck` a silent no-op today — fixing them first means every other layer's work is actually type-checked.

---

## BLOCKERS — typecheck is currently a no-op for critical files

### CFG1 — `packages/router/tsconfig.json` is broken  `[BLOCKER]`
- Wrong alias: `"@projectx/platform-web": ["./src"]` points at the router's own src (copy-paste from platform-web). Remove or correct.
- `include: ["src/lib/**/*","src/stores/**/*"]` + `exclude: ["src/routes"]`, but the router's only source is `src/routes/`. **TypeScript sees an empty project.** Fix `include` to cover actual source.

### CFG2 — `composes/platform/web/tsconfig.json` excludes routes  `[BLOCKER]`
- `include` covers `lib/stores/components`; `exclude: ["src/routes"]`. Route files — the primary export surface (`platformRoutes`) — are not type-checked. Fix so `tsc --noEmit` checks `src/routes/`.

### CFG3 — `apps/web/tsconfig.app.json` stale alias  `[BLOCKER]`
- `"@projectx/platform": ["./node_modules/@projectx/platform/web"]` — no package `@projectx/platform` exists. `build` runs `tsc -b` using this config, so the broken alias is active in production builds. Remove it; the correct alias is `@projectx/platform-web`.

### CFG4 — `ComposeManifest` type missing  `[BLOCKER]`
- Type referenced by docs (`apps/web/src/types/compose.ts`) does not exist anywhere; `grep ComposeManifest` = 0 hits. Create it (see `04` CP1 — recommend a shared package so shell + composes share one definition).

---

## MAJOR

### CFG5 — No test infrastructure  `[MAJOR]`
- No `test` task in `turbo.json`, no test files, no runner config. Core is pure logic and should be TDD'd.
- Add a `test` task to `turbo.json`; add `"test"` scripts (Bun's built-in `bun test` is simplest, given Bun is the PM). Wire into CI later.

### CFG6 — `packages/ui` peerDependency on private workspace pkg  `[MAJOR]`
- `packages/ui/package.json:47` lists `@repo/config` in **both** `devDependencies` and `peerDependencies`. A peer dep on a `private:true` workspace pkg is nonsensical. Remove from `peerDependencies`.

### CFG7 — `apps/web` missing `@projectx/server` + Eden Treaty  `[MAJOR]`
- `apps/web` has no `@projectx/server` workspace dep; uses raw `fetch` with hand-written types. Docs require Eden Treaty `App` type. Add dep, adopt Eden Treaty. (Ties to `02` W5 / `04` CP7.)

### CFG8 — `composes/platform/server/tsconfig.json` clears bun types  `[MAJOR]`
- `"types": []` override drops `bun-types` from the inherited base; relies on implicit `@types/bun` discovery. Make Bun globals explicit (`"types": ["bun"]` or `@types/bun`).

### CFG9 — `apps/web` ESLint not extending shared config  `[MAJOR]`
- Hand-rolled `eslint.config.js`, no `@repo/config/eslint/react`, no typed-checking (`parserOptions.project`). Extend the shared config.

---

## MINOR

- **CFG10** `packages/config` has no own `tsconfig.json` (docs say it extends `tsconfig/lib`).
- **CFG11** `packages/config/tsconfig/base.json:12-13` sets `noUnusedLocals/noUnusedParameters: false`; docs require `true`. Silently disables two strict checks monorepo-wide.
- **CFG12** `packages/config/tailwind.config.js:140` uses `require('tailwindcss-animate')` in a `type:module` package — invalid ESM (works in Bun, breaks Node CLI). Use import.
- **CFG13** `tailwindcss-animate` used but not a declared devDep in `packages/config`.
- **CFG14** No `build` script in `packages/router`, `packages/ui`, `composes/platform/{server,web}`. `turbo build`/`^build` are no-ops for them. Fine while exporting source, but `dev` depends on `^build` → false dependency signal. Either add builds or drop the `^build` dep for source-only packages.
- **CFG15** No `clean` turbo task (root has a `clean` script not wired to turbo).
- **CFG16** TypeScript version split: `^5.9.3` (root/apps) vs `^5.3.3` (packages/composes). Align to one.
- **CFG17** No `eslint.config.js` in `composes/platform/{server,web}` (docs require one per compose).
- **CFG18** `packageManager` pins `bun@1.0.25` (old) — bump.
- **CFG19** `packages/router`/`ui` extend `tsconfig/web` (`noEmit:true`) so `outDir:"dist"` is dead — fine for source export, but align intent vs the docs' `tsconfig/lib`.

---

## Acceptance for this file
- [ ] `bun run typecheck` checks **all** source including `packages/router/src/routes` and `composes/platform/web/src/routes`.
- [ ] No stale/wrong path aliases resolve to nonexistent packages.
- [ ] `ComposeManifest` type exists and is importable.
- [ ] `turbo run test` exists and runs (even if only Core has tests initially).
