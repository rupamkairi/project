# Plan: Compose Web Consistency

Agent: codex
Status: drafting

## Goal
Create a single web code quality standard and bring all compose web packages into strict alignment with it.

## Assumptions
- Scope includes `composes/*/web`, and may extend to `apps/web` plus `packages/router` if they are part of the compose assembly path.
- Existing docs are the source of truth where code and docs disagree.
- Changes should prefer shared UI, shared router, and shared auth/state patterns over per-compose drift.

## Steps
1. Inventory every compose web package and the shell entrypoints they depend on.
2. Write a central web code quality doc covering React, TypeScript, Zustand, routing, API clients, styling, and file/export conventions.
3. Compare each compose web package against the standard and classify drift as structural, stylistic, or contract-level.
4. Fix the highest-value inconsistencies with the smallest shared changes first.
5. Verify route exports, package exports, path aliases, and shell registration stay aligned after changes.

## Risks
- Some packages may be incomplete or intentionally different because they serve distinct app shapes.
- The shell may rely on older compose exports, so normalization can require coordinated updates.
- A broad consistency pass can accidentally widen scope unless the standard stays strict and minimal.
