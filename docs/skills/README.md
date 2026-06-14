# Agent Skills

Skills are loaded via the Claude Code skill system. Full skill definitions live in `.agents/skills/`.  
Invoke with the `Skill` tool: `skill: "{name}"` — or by typing `/{name}` in the chat.

---

## ProjectX-specific skills

These skills are custom-built for this codebase.

### compose-spec
**When:** User asks to "spec out" a feature, "write a spec for", "plan the implementation of", or wants to design something before coding.  
**What:** Generates a complete, architecturally consistent feature spec for any functionality inside the Core → Module → Compose architecture.  
**Also triggers:** When user provides a compose doc and wants to implement a specific section.

### compose-todo
**When:** User says "generate todos", "create tasks", "break this down", "implementation checklist", or "what do I need to build" — especially after having a spec.  
**What:** Converts a feature spec into a granular, layer-by-layer implementation todo list.  
**Sequence:** `compose-spec` → `compose-todo` → implement.

---

## UI & Frontend

### ui-styling
**When:** Building UI, implementing design systems, responsive layouts, accessible components, customizing themes, dark mode.  
**What:** shadcn/ui (Radix UI + Tailwind), Tailwind CSS utility patterns, canvas-based visual designs.  
**References:** shadcn components, theming, accessibility, Tailwind customization, responsive patterns.

### building-components
**When:** Building new components, implementing accessibility, creating composable APIs, setting up design tokens, publishing to registry.  
**What:** Guide for modern, accessible, composable UI components.

### vercel-react-best-practices
**When:** Writing, reviewing, or refactoring React/Next.js code — components, data fetching, bundle optimization, performance improvements.  
**What:** React and Next.js performance optimization from Vercel Engineering.  
**Covers:** Rerender prevention, memoization, async patterns, bundle splitting, server-side optimizations, client-side patterns.

### vite-advanced
**When:** Customizing build pipelines, creating Vite plugins, configuring multi-environment builds, SSR, library mode.  
**What:** Advanced Vite 7+ patterns — Environment API, plugin development, SSR, library mode, chunk optimization.

### web-design-guidelines
**When:** "Review my UI", "check accessibility", "audit design", "review UX", "check against best practices".  
**What:** Audits UI code against web interface guidelines and accessibility standards.  
**Usage:** Pass a file pattern as argument: `/web-design-guidelines src/components/**.tsx`

### zustand-state-management
**When:** State management in React/Next.js with TypeScript, Zustand store design, slice patterns.  
**What:** Best practices for Zustand — stores, slices, subscriptions, TypeScript integration.

---

## Backend & Server

### elysiajs
**When:** Building Elysia server routes, plugins, middleware, WebSockets, validation, lifecycle hooks, or integrating Elysia with external tools.  
**What:** Type-safe Elysia backend development. Always consults `elysiajs.com/llms.txt` for latest API.  
**Covers:**
- Integrations: AI SDK, better-auth, Drizzle, Astro, Next.js, React Email, Cloudflare Workers, Deno, Expo, Nuxt, SvelteKit, TanStack Start, Node.js, Vercel
- Plugins: CORS, JWT, bearer, OpenAPI/Swagger, OpenTelemetry, server timing, cron, static, HTML, GraphQL (Apollo + Yoga)
- References: routes, validation, lifecycle, macros, cookies, WebSockets, Eden (type-safe client), deployment, testing

---

## Data & Queries

### tanstack-query
**When:** Server-state management in React — caching, background refetching, optimistic updates, pagination, mutations.  
**What:** TanStack Query (React Query) — query keys, cache management, devtools, SSR hydration, infinite queries.

---

## Monorepo & Build

### turborepo
**When:** Configuring Turbo tasks, pipelines, remote cache, CI optimization, environment variables, `--filter`, monorepo structure, package boundaries.  
**What:** Turborepo build system — tasks, caching, filtering, CI patterns, boundaries, best practices.  
**Covers:**
- Task configuration, `turbo.json`, `dependsOn`
- Caching (local + remote), gotchas
- CLI commands, `--filter`, `--affected`
- Environment variable modes
- CI: GitHub Actions, Vercel patterns
- Package structure, internal packages, boundaries

---

## Workflows

### workflow
**When:** Building durable, resumable workflows — multi-step operations, retry on failure, pause for external events, step-based orchestration.  
**What:** Vercel Workflow DevKit patterns — durable functions, event subscriptions, queues, step orchestration.  
**Keywords:** "workflow", "durable functions", "resumable", "retry", "queue", "event-driven steps"

---

## Skill invocation reference

```
Skill tool:     skill: "compose-spec"
Chat command:   /compose-spec
                /compose-todo
                /elysiajs
                /ui-styling
                /turborepo
                /tanstack-query
                /vite-advanced
                /web-design-guidelines
                /building-components
                /vercel-react-best-practices
                /zustand-state-management
                /workflow
```

---

## Adding a new skill

1. Create `.agents/skills/{name}/SKILL.md` with frontmatter `name:` and `description:`
2. Add reference files to `.agents/skills/{name}/references/` or `rules/`
3. Register it here in `docs/skills/README.md`
