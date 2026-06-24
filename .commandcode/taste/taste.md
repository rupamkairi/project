# Architecture
- Follow Core → Module → Compose → Shell 4-layer architecture. Modules communicate via EventBus + CQRS only. Compose is the only meeting point between server and web. Confidence: 1.0
- Use Bun as package manager and runtime. No npm/pnpm/node. Confidence: 1.0
- Use Turborepo for build orchestration with task pipelines. Confidence: 1.0

# Server
- Use Elysia with TypeBox schemas for HTTP APIs. Mount composes as Elysia plugins via `.use()`. Confidence: 1.0
- Use Drizzle ORM with PostgreSQL (Neon). Master-detail table pattern: foundation masters (unprefixed, plural), feature modules (3-letter prefix), compose details (3-letter prefix). Confidence: 1.0
- Use Result<T, E> pattern — no thrown exceptions for business logic paths. Confidence: 1.0
- Use BullMQ + ioredis for background queues and Cron for job scheduling. Confidence: 1.0

# Web
- Use React 19 + Vite 7 + TanStack Router for routing and TanStack Query for server state. Zustand for client-only stores. Confidence: 1.0
- Use shadcn/ui (Radix primitives) + Tailwind CSS v4 for UI. Semantic color tokens only, compact density (h-8 inputs), 4px grid. Use cn() for className merging. Confidence: 1.0

# Code Style
- Use TypeScript strict mode. No semicolons, single quotes, trailing commas (Prettier). kebab-case files, PascalCase components, camelCase functions/variables. Confidence: 1.0
- Use Bun test (not Jest/Vitest). Core tests must pass before changes to core. Confidence: 1.0
- Docs are source of truth — when code and docs conflict, docs win. Plans go in plans/{task-slug}.{agent}.plan.md. Confidence: 1.0
