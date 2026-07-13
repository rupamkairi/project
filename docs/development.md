# Development

## Tooling

Use Bun. The root workspace scripts are:

| Purpose | Command |
| --- | --- |
| Type-check workspaces | `bun run typecheck` |
| Lint workspaces | `bun run lint` |
| Build workspaces | `bun run build` |
| Run workspace tests | `bun test` or the package-specific test script |

Do not start a root or nested `dev` script: a development server is already running for this repository. Run a package command only when the task calls for it.

## Package entry points

Use the package's `package.json` for available scripts and the package `src/index.ts` for its public interface. In particular:

- Server database commands are in `apps/server/package.json` (`db:generate`, `db:migrate`, `db:push`, `db:seed`, and related scripts).
- API artifacts are generated from `apps/server` with `bun run docs:generate` or `bun run docs:export-openapi`.
- The web host is `apps/web`; compose packages have their own type-check and, where provided, test scripts.

## Documentation policy

Document only durable operating context here. Code, package manifests, generated API output, and tests are the canonical implementation record. Avoid duplicating route lists, schema fields, design specs, phase plans, or command inventories in Markdown.

## Contributor rules

Read `AGENTS.md` before making changes. Plans requested by a user belong in `plans/<task-name>.<agent-name>.plan.md` and are task artifacts, not long-lived architecture documentation.
