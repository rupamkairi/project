# Plans Directory

AI agents store planning documents here before implementing tasks.

---

## File naming

```
plans/{task-slug}.<agent-name>.plan.md
```

| Part | Rule | Examples |
|---|---|---|
| `task-slug` | kebab-case, describes the task | `add-crm-compose` `fix-worker-routing` `migrate-identity-schema` |
| `agent-name` | your agent identifier, lowercase | `claude` `codex` `gemini` `cursor` |

**Full examples:**
```
plans/add-crm-compose.claude.plan.md
plans/migrate-auth-module.codex.plan.md
plans/refactor-core-entity.cursor.plan.md
plans/fix-worker-job-routing.claude.plan.md
```

---

## When to create a plan

- Task spans 3+ files
- Task involves architectural decisions
- Task was interrupted and needs resuming
- Task has risks or multiple valid approaches
- You want to confirm approach before coding

---

## Plan format

```markdown
# Plan: {Task Name}

Agent: {agent-name}
Status: drafting | in-progress | done | abandoned

## Goal
One sentence.

## Approach
Numbered steps.

## Files to change
- path/to/file.ts — what changes

## Risks
What could go wrong.

## Notes
Anything else.
```

---

## Rules

1. **Plan before code** — write here first, then implement
2. **One plan per task** — don't combine unrelated tasks in one file
3. **Update status** — change `Status:` as work progresses
4. **Delete when done** — remove completed or abandoned plans; don't let them go stale
5. **No code in plans** — pseudocode OK; full implementations belong in source files
6. **Never create plans outside this directory**

---

## Subdirectories

### `baseline/`

Wave-by-wave implementation roadmap. Read before starting any Wave work:

- `baseline/01-core.md` — Wave 1: Core layer (complete)
- `baseline/02-infra-shell.md` — Wave 2: Worker dispatch, `/ws`, graceful shutdown
- `baseline/03-modules.md` — Wave 3: `identity` module end-to-end
- `baseline/04-compose.md` — Wave 4: `ComposeManifest`, `interfaces/` layer, module routing
