# Server Compose Consistency

## Goal
Normalize the six live compose server packages and the `apps/server` shell around one repo-wide server contract, with docs as the source of truth.

## Assumptions
- Scope is limited to live compose servers: `platform`, `crm`, `ecommerce`, `lms`, `restaurant`, `erp`.
- Domain-specific differences are allowed only when documented as explicit exceptions.
- Existing repo typecheck noise may remain outside the touched surfaces.

## Steps
1. Add a server-quality standard doc and surface it from the main docs entry points.
2. Normalize compose factories, route-module factories, seed exports, package exports, and tsconfig aliases.
3. Update `apps/server` to import and mount the canonical compose factories.
4. Add or update compliance guidance so the final code shape is unambiguous.
5. Verify the touched surfaces against repo typecheck and targeted checks.

## Risks / checks
- Existing unrelated TypeScript failures may block a clean repo-wide typecheck.
- Docs examples can drift back out of sync if the canonical names are not used everywhere agents look first.
